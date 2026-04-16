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

public class SyncService {

    private static final int POLL_INTERVAL_SECONDS = 30;
    private static final ObjectMapper JSON = new ObjectMapper();

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "sync-worker");
        t.setDaemon(true);
        return t;
    });

    private final IncidentRepository incidentRepo = new IncidentRepository();

    private volatile boolean isSyncing = false;
    private volatile String lastPullTimestamp = null;
    private volatile long lastSyncEpoch = 0;

    private ScheduledFuture<?> task;
    private Consumer<Boolean> onStatusChange;
    private Runnable onIncidentsChanged;
    private volatile PluginEventBus eventBus;

    public void setEventBus(PluginEventBus eventBus) {
        this.eventBus = eventBus;
    }

    public void setOnStatusChange(Consumer<Boolean> listener) {
        this.onStatusChange = listener;
    }

    public void setOnIncidentsChanged(Runnable listener) {
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
     * Submits a poll to the scheduler and blocks until it completes.
     * Safe to call from a background thread (e.g. manual sync button).
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
            pullIncidents(token, justPushed);

            lastSyncEpoch = System.currentTimeMillis();
            SQLiteDatabase.logSync(true);
            notifyStatus(true);
            notifyIncidentsChanged();
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
     * Pushes all dirty incidents to the server and returns the set of remote IDs
     * that were just pushed, so the subsequent pull can skip them (avoids the pull
     * overwriting values the server may not have stored correctly yet).
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
        ApiService.post("/incidents/sync", body, token);

        Set<String> pushed = new HashSet<>();
        for (int i = 0; i < dirty.size(); i++) {
            IncidentRepository.Incident inc = dirty.get(i);
            if (inc.remoteId() == null || inc.remoteId().isBlank()) {
                incidentRepo.assignRemoteId(inc.localId(), syncIds.get(i));
            }
            incidentRepo.markSynced(inc.localId());
            updateBaseAfterPush(inc);
            pushed.add(syncIds.get(i));
        }
        return pushed;
    }

    private void updateBaseAfterPush(IncidentRepository.Incident inc) {
        try {
            incidentRepo.updateBase(inc.localId(), inc.title(), inc.description(),
                    inc.status(), inc.updatedAt());
        } catch (Exception ignored) {
            // Non-critical: LWW fallback applies on next pull if base update fails
        }
    }

    private void pullIncidents(String token, Set<String> justPushed) throws Exception {
        boolean isFullPull = lastPullTimestamp == null;
        String path = isFullPull
                ? "/incidents?limit=100"
                : "/incidents?limit=100&since=" + lastPullTimestamp;

        String response = ApiService.get(path, token);
        JsonNode incidents = JSON.readTree(response);

        if (!incidents.isArray()) return;

        String newestTs = lastPullTimestamp;
        Set<String> seenRemoteIds = isFullPull ? new HashSet<>() : null;

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
            }

            if (seenRemoteIds != null) seenRemoteIds.add(remoteId);
            if (newestTs == null || updatedAt.compareTo(newestTs) > 0) {
                newestTs = updatedAt;
            }
        }

        if (isFullPull && seenRemoteIds != null) {
            incidentRepo.tombstoneOrphans(seenRemoteIds);
        }

        if (newestTs != null) {
            lastPullTimestamp = newestTs;
        }
    }

    private void notifyStatus(boolean online) {
        if (onStatusChange != null) {
            statusDispatcher.accept(() -> onStatusChange.accept(online));
        }
    }

    private void notifyIncidentsChanged() {
        if (onIncidentsChanged != null) {
            statusDispatcher.accept(onIncidentsChanged);
        }
    }

    private Consumer<Runnable> statusDispatcher = Platform::runLater;

    public long getLastSyncEpoch() {
        return lastSyncEpoch;
    }

    void setStatusDispatcher(Consumer<Runnable> dispatcher) {
        this.statusDispatcher = dispatcher;
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
