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
    // safety bound against an unbounded loop (~1M incidents per scope)
    private static final int MAX_PULL_PAGES = 10000;
    private static final ObjectMapper JSON = new ObjectMapper();

    // test seam over ApiService.get (throws a checked exception, hence a dedicated interface)
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
    private IntConsumer onChangesReverted;
    private volatile PluginEventBus eventBus;

    public void setEventBus(PluginEventBus eventBus) {
        this.eventBus = eventBus;
    }

    public void setOnStatusChange(Consumer<Boolean> listener) {
        this.onStatusChange = listener;
    }

    /** Listener called on the status dispatcher thread after a sync that changed local data, with the pulled incident count. */
    public void setOnIncidentsChanged(IntConsumer listener) {
        this.onIncidentsChanged = listener;
    }

    /** Listener called on the status dispatcher thread when the server refused pushed changes, with the refused row count. */
    public void setOnChangesReverted(IntConsumer listener) {
        this.onChangesReverted = listener;
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

    /** Runs a poll on the scheduler and blocks until it completes. Safe from background threads. */
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
     * Pushes dirty incidents and returns the remote ids the server actually upserted,
     * so the next pull can skip them. Server-skipped rows lose their dirty flag —
     * the edit was refused, and the next pull restores the server version.
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
        int refusedCount = 0;
        for (int i = 0; i < dirty.size(); i++) {
            IncidentRepository.Incident inc = dirty.get(i);
            String syncId = syncIds.get(i);
            if (skippedIds.contains(syncId)) {
                incidentRepo.markSynced(inc.localId());
                LOG.info("Server refused incident " + syncId + "; local change dropped, next pull restores it");
                refusedCount++;
                continue;
            }
            if (inc.remoteId() == null || inc.remoteId().isBlank()) {
                incidentRepo.assignRemoteId(inc.localId(), syncId);
            }
            incidentRepo.markSynced(inc.localId());
            updateBaseAfterPush(inc);
            pushed.add(syncId);
        }
        if (refusedCount > 0) notifyChangesReverted(refusedCount);
        return pushed;
    }

    /**
     * Reads the {@code skippedIds} array from the sync response.
     * Empty set if the field is absent or the body unreadable (older servers).
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
            // non-critical: LWW fallback applies on the next pull
            LOG.log(Level.FINE, "Base snapshot update failed after push", e);
        }
    }

    /**
     * Pulls incidents from the server and returns how many are new to this client
     * (updated since the last pull and not pushed by us).
     */
    // package-private for tests with a fake PageFetcher
    int pullIncidents(String token, Set<String> justPushed) throws Exception {
        boolean isFullPull = lastPullTimestamp == null;
        String previousPullTs = lastPullTimestamp;

        String newestTs = lastPullTimestamp;
        Set<String> seenRemoteIds = isFullPull ? new HashSet<>() : null;
        int receivedCount = 0;
        boolean reachedLastPage = false;

        // paginate the whole scope, otherwise tombstoneOrphans deletes unseen incidents
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

                // Reconcile every row, pushed ones included: the server may have clamped an
                // invalid transition, so a just-pushed row still needs the merge to converge.
                incidentRepo.upsertFromServer(remoteId, title, description, status, updatedAt);

                boolean newToClient = previousPullTs == null || updatedAt.compareTo(previousPullTs) > 0;
                if (newToClient && !justPushed.contains(remoteId)) {
                    receivedCount++;
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

        // tombstone only after a complete pull; a MAX_PULL_PAGES bailout leaves the set partial
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

    private void notifyChangesReverted(int refusedCount) {
        if (onChangesReverted != null) {
            statusDispatcher.accept(() -> onChangesReverted.accept(refusedCount));
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
