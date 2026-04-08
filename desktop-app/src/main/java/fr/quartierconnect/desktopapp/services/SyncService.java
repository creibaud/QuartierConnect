package fr.quartierconnect.desktopapp.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fr.quartierconnect.desktopapp.database.IncidentRepository;
import fr.quartierconnect.desktopapp.database.SQLiteDatabase;
import javafx.application.Platform;

import java.util.ArrayList;
import java.util.List;
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

    private ScheduledFuture<?> task;
    private Consumer<Boolean> onStatusChange;
    private Runnable onIncidentsChanged;

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

    private void poll() {
        if (isSyncing) return;
        isSyncing = true;
        try {
            String token = AuthService.getInstance().getAccessToken();
            if (token == null) {
                notifyStatus(false);
                return;
            }

            pushDirtyIncidents(token);
            pullIncidents(token);

            SQLiteDatabase.logSync(true);
            notifyStatus(true);
            notifyIncidentsChanged();
        } catch (Exception e) {
            SQLiteDatabase.logSync(false);
            notifyStatus(false);
        } finally {
            isSyncing = false;
        }
    }

    private void pushDirtyIncidents(String token) throws Exception {
        List<IncidentRepository.Incident> dirty = incidentRepo.listDirty();
        if (dirty.isEmpty()) return;

        List<Object> payload = new ArrayList<>();
        for (IncidentRepository.Incident inc : dirty) {
            payload.add(new java.util.LinkedHashMap<String, Object>() {{
                put("title", inc.title());
                put("description", inc.description());
                put("status", inc.status());
                put("updatedAt", inc.updatedAt());
            }});
        }

        String body = JSON.writeValueAsString(java.util.Map.of("incidents", payload));
        String response = ApiService.post("/incidents/sync", body, token);

        JsonNode root = JSON.readTree(response);
        JsonNode ids = root.path("ids");
        if (ids.isArray()) {
            for (int i = 0; i < ids.size() && i < dirty.size(); i++) {
                String remoteId = ids.get(i).asText(null);
                if (remoteId != null && !remoteId.isEmpty()) {
                    incidentRepo.writeRemoteId(dirty.get(i).localId(), remoteId);
                }
            }
        } else {
            for (IncidentRepository.Incident inc : dirty) {
                incidentRepo.markSynced(inc.localId());
            }
        }
    }

    private void pullIncidents(String token) throws Exception {
        String path = lastPullTimestamp != null
                ? "/incidents?limit=100&since=" + lastPullTimestamp
                : "/incidents?limit=100";

        String response = ApiService.get(path, token);
        JsonNode incidents = JSON.readTree(response);

        if (!incidents.isArray()) return;

        String newestTs = lastPullTimestamp;
        for (JsonNode node : incidents) {
            String remoteId = node.path("id").asText(null);
            if (remoteId == null) continue;

            String title = node.path("title").asText("");
            String description = node.path("description").asText(null);
            String status = node.path("status").asText("open");
            String updatedAt = node.path("updatedAt").asText(null);
            if (updatedAt == null) updatedAt = node.path("updated_at").asText("");

            incidentRepo.upsertFromServer(remoteId, title, description, status, updatedAt);

            if (newestTs == null || updatedAt.compareTo(newestTs) > 0) {
                newestTs = updatedAt;
            }
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

    void setStatusDispatcher(Consumer<Runnable> dispatcher) {
        this.statusDispatcher = dispatcher;
    }
}
