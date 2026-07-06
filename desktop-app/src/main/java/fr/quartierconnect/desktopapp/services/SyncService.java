package fr.quartierconnect.desktopapp.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fr.quartierconnect.desktopapp.database.IncidentRepository;
import fr.quartierconnect.desktopapp.database.SQLiteDatabase;
import fr.quartierconnect.desktopapp.plugin.PluginEventBus;
import javafx.application.Platform;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import java.util.function.IntConsumer;
import java.util.logging.Level;
import java.util.logging.Logger;

public class SyncService {

    private static final Logger LOG = Logger.getLogger(SyncService.class.getName());

    private static final int POLL_INTERVAL_SECONDS = 30;
    private static final int PULL_PAGE_SIZE = 100;
    // Safety bound against an unbounded loop (~1M incidents per scope).
    private static final int MAX_PULL_PAGES = 10000;
    private static final ObjectMapper JSON = new ObjectMapper();

    // Seam over ApiService.get so pagination can be driven by a fake in tests
    // (ApiService.get throws a checked exception, hence a dedicated interface).
    @FunctionalInterface
    interface PageFetcher {
        String fetch(String path, String token) throws Exception;
    }

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "sync-worker");
        t.setDaemon(true);
        return t;
    });

    private final IncidentRepository incidentRepo = new IncidentRepository();

    private PageFetcher pageFetcher = ApiService::get;

    private volatile boolean isSyncing = false;
    private volatile String lastPullTimestamp = null;
    private volatile long lastSyncEpoch = 0;

    private ScheduledFuture<?> task;
    private Consumer<Boolean> onStatusChange;
    private IntConsumer onIncidentsChanged;
    private volatile PluginEventBus eventBus;

    public void setEventBus(PluginEventBus eventBus) {
        this.eventBus = eventBus;
    }

    public void setOnStatusChange(Consumer<Boolean> listener) {
        this.onStatusChange = listener;
    }

    /**
     * Enregistre un écouteur invoqué (sur le thread répartiteur de statut) après une
     * synchronisation ayant modifié les données locales ; reçoit le nombre d'incidents récupérés
     * depuis le serveur depuis la synchronisation précédente.
     */
    public void setOnIncidentsChanged(IntConsumer listener) {
        this.onIncidentsChanged = listener;
    }

    public void start() {
        if (task != null && !task.isDone()) return;
        task = scheduler.scheduleAtFixedRate(this::poll, 0, POLL_INTERVAL_SECONDS, TimeUnit.SECONDS);
    }

    public void stop() {
        if (task != null) task.cancel(false);
    }

    public void shutdown() {
        stop();
        scheduler.shutdownNow();
    }

    public void syncNow() {
        if (!isSyncing) scheduler.execute(this::poll);
    }

    /**
     * Soumet un sondage à l'ordonnanceur et bloque jusqu'à sa fin.
     * Peut être appelée sans risque depuis un thread d'arrière-plan (par exemple le bouton de synchronisation manuelle).
     */
    public void syncNowAndWait() throws Exception {
        java.util.concurrent.CompletableFuture<Void> future = new java.util.concurrent.CompletableFuture<>();
        scheduler.execute(() -> {
            try {
                poll();
                future.complete(null);
            } catch (Exception e) {
                future.completeExceptionally(e);
            }
        });
        future.get(30, TimeUnit.SECONDS);
    }

    private void poll() {
        if (isSyncing) return;
        isSyncing = true;
        try {
            String token = AuthService.getInstance().getAccessToken();

            if (token == null || AuthService.getInstance().isTokenExpired(token)) {
                boolean refreshed = AuthService.getInstance().refreshAccessToken();
                if (!refreshed) {
                    notifyStatus(false);
                    return;
                }
                token = AuthService.getInstance().getAccessToken();
                if (token == null) {
                    notifyStatus(false);
                    return;
                }
            }

            publishEvent(PluginEventBus.Event.SYNC_STARTED);

            Set<String> justPushed = pushDirtyIncidents(token);
            int receivedCount = pullIncidents(token, justPushed);

            lastSyncEpoch = System.currentTimeMillis();
            SQLiteDatabase.logSync(true);
            notifyStatus(true);
            if (receivedCount > 0 || !justPushed.isEmpty()) {
                notifyIncidentsChanged(receivedCount);
            }
            publishEvent(PluginEventBus.Event.INCIDENTS_CHANGED);
            publishEvent(PluginEventBus.Event.SYNC_COMPLETED);
        } catch (Exception e) {
            SQLiteDatabase.logSync(false);
            notifyStatus(false);
            publishEvent(PluginEventBus.Event.SYNC_FAILED, e.getMessage());
        } finally {
            isSyncing = false;
        }
    }

    /**
     * Envoie au serveur tous les incidents modifiés et retourne l'ensemble des identifiants distants
     * que le serveur a réellement upsertés, afin que le pull suivant puisse les ignorer (évite que le
     * pull n'écrase des valeurs que le serveur n'a peut-être pas encore stockées correctement).
     * Les incidents que le serveur signale comme ignorés restent modifiés et sont réessayés plus tard.
     */
    private Set<String> pushDirtyIncidents(String token) throws Exception {
        List<IncidentRepository.Incident> dirty = incidentRepo.listDirty();
        if (dirty.isEmpty()) return Set.of();

        String userId = AuthService.getInstance().getCurrentUserId();
        if (userId == null) return Set.of();

        List<String> syncIds = new ArrayList<>();
        List<Object> payload = new ArrayList<>();

        for (IncidentRepository.Incident inc : dirty) {
            String syncId = (inc.remoteId() != null && !inc.remoteId().isBlank())
                    ? inc.remoteId()
                    : UUID.randomUUID().toString();
            syncIds.add(syncId);

            String desc = (inc.description() != null && !inc.description().isBlank())
                    ? inc.description() : "—";

            payload.add(new java.util.LinkedHashMap<String, Object>() {{
                put("id",          syncId);
                put("title",       inc.title());
                put("description", desc);
                put("status",      inc.status());
                put("createdBy",   userId);
                put("updatedAt",   inc.updatedAt());
            }});
        }

        String body = JSON.writeValueAsString(java.util.Map.of("incidents", payload));
        String response = ApiService.post("/incidents/sync", body, token);
        Set<String> skippedIds = parseSkippedIds(response);

        Set<String> pushed = new HashSet<>();
        for (int i = 0; i < dirty.size(); i++) {
            IncidentRepository.Incident inc = dirty.get(i);
            String syncId = syncIds.get(i);
            if (skippedIds.contains(syncId)) continue;
            if (inc.remoteId() == null || inc.remoteId().isBlank()) {
                incidentRepo.assignRemoteId(inc.localId(), syncId);
            }
            incidentRepo.markSynced(inc.localId());
            updateBaseAfterPush(inc);
            pushed.add(syncId);
        }
        return pushed;
    }

    /**
     * Extrait le tableau {@code skippedIds} de la réponse à {@code POST /incidents/sync}
     * ({@code {upserted, skipped, skippedIds}}). Retourne un ensemble vide si le champ est
     * absent ou le corps illisible (serveurs plus anciens), préservant l'ancien comportement
     * consistant à tout marquer comme synchronisé.
     */
    static Set<String> parseSkippedIds(String syncResponseBody) {
        if (syncResponseBody == null || syncResponseBody.isBlank()) return Set.of();
        try {
            JsonNode skipped = JSON.readTree(syncResponseBody).path("skippedIds");
            if (!skipped.isArray()) return Set.of();
            Set<String> ids = new HashSet<>();
            for (JsonNode idNode : skipped) {
                if (idNode.isTextual()) ids.add(idNode.asText());
            }
            return ids;
        } catch (Exception e) {
            return Set.of();
        }
    }

    private void updateBaseAfterPush(IncidentRepository.Incident inc) {
        try {
            incidentRepo.updateBase(inc.localId(), inc.title(), inc.description(),
                    inc.status(), inc.updatedAt());
        } catch (Exception e) {
            // Non critique : le repli LWW s'applique au prochain pull si la mise à jour de la base échoue
            LOG.log(Level.FINE, "Base snapshot update failed after push", e);
        }
    }

    /**
     * Récupère les incidents depuis le serveur et retourne combien d'entre eux sont nouveaux pour
     * ce client (mis à jour depuis le pull précédent et non envoyés par nous),
     * afin que l'UI puisse annoncer « N incidents reçus ».
     */
    // Package-private for direct testing with a fake PageFetcher (no network,
    // no AuthService), driven independently of the poll() scheduler loop.
    int pullIncidents(String token, Set<String> justPushed) throws Exception {
        boolean isFullPull = lastPullTimestamp == null;
        String previousPullTs = lastPullTimestamp;

        String newestTs = lastPullTimestamp;
        Set<String> seenRemoteIds = isFullPull ? new HashSet<>() : null;
        int receivedCount = 0;
        boolean reachedLastPage = false;

        // Paginate the whole scope: a single limit-capped page would leave any
        // incident beyond page 1 unseen, and tombstoneOrphans would then delete
        // it locally by mistake.
        for (int page = 1; page <= MAX_PULL_PAGES; page++) {
            String path = buildPullPath(isFullPull, previousPullTs, page);
            String response = pageFetcher.fetch(path, token);
            JsonNode incidents = JSON.readTree(response);
            if (!incidents.isArray()) break;

            for (JsonNode node : incidents) {
                String remoteId = node.path("id").asText(null);
                if (remoteId == null) continue;

                String title       = node.path("title").asText("");
                String description = node.path("description").asText(null);
                String status      = node.path("status").asText("open");
                String updatedAt   = node.path("updatedAt").asText(null);
                if (updatedAt == null) updatedAt = node.path("updated_at").asText("");

                if (!justPushed.contains(remoteId)) {
                    incidentRepo.upsertFromServer(remoteId, title, description, status, updatedAt);
                    if (previousPullTs == null || updatedAt.compareTo(previousPullTs) > 0) {
                        receivedCount++;
                    }
                }

                if (seenRemoteIds != null) seenRemoteIds.add(remoteId);
                if (newestTs == null || updatedAt.compareTo(newestTs) > 0) {
                    newestTs = updatedAt;
                }
            }

            if (incidents.size() < PULL_PAGE_SIZE) {
                reachedLastPage = true;
                break;
            }
        }

        // Only tombstone once the whole scope has been seen (a short last page).
        // Bailing out on MAX_PULL_PAGES with full pages leaves the set partial,
        // so we keep local data rather than delete unseen incidents.
        if (isFullPull && reachedLastPage && seenRemoteIds != null) {
            incidentRepo.tombstoneOrphans(seenRemoteIds);
        }

        if (newestTs != null) {
            lastPullTimestamp = newestTs;
        }
        return receivedCount;
    }

    private static String buildPullPath(boolean isFullPull, String since, int page) {
        String base = "/incidents?limit=" + PULL_PAGE_SIZE + "&page=" + page;
        if (isFullPull) return base;
        return base + "&since="
                + java.net.URLEncoder.encode(since, java.nio.charset.StandardCharsets.UTF_8);
    }

    private void notifyStatus(boolean online) {
        if (onStatusChange != null) {
            statusDispatcher.accept(() -> onStatusChange.accept(online));
        }
    }

    private void notifyIncidentsChanged(int receivedCount) {
        if (onIncidentsChanged != null) {
            statusDispatcher.accept(() -> onIncidentsChanged.accept(receivedCount));
        }
    }

    private Consumer<Runnable> statusDispatcher = Platform::runLater;

    public long getLastSyncEpoch() {
        return lastSyncEpoch;
    }

    void setStatusDispatcher(Consumer<Runnable> dispatcher) {
        this.statusDispatcher = dispatcher;
    }

    void setPageFetcher(PageFetcher fetcher) {
        this.pageFetcher = fetcher;
    }

    void setLastPullTimestampForTest(String timestamp) {
        this.lastPullTimestamp = timestamp;
    }

    private void publishEvent(PluginEventBus.Event event) {
        publishEvent(event, null);
    }

    private void publishEvent(PluginEventBus.Event event, Object payload) {
        PluginEventBus bus = this.eventBus;
        if (bus != null) {
            bus.publish(event, payload);
        }
    }
}
