package fr.quartierconnect.desktopapp.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import java.util.logging.Logger;

/**
 * Checks the API for application updates in the background.
 * Calls the provided callback when an update is available.
 */
public class UpdateService {

    private static final Logger LOG = Logger.getLogger(UpdateService.class.getName());

    private static final String CURRENT_VERSION = "1.0.0";
    private static final long CHECK_INTERVAL_HOURS = 24;

    private final ScheduledExecutorService scheduler =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "update-checker");
                t.setDaemon(true);
                return t;
            });

    private Consumer<String> onUpdateAvailable;

    public void setOnUpdateAvailable(Consumer<String> callback) {
        this.onUpdateAvailable = callback;
    }

    /**
     * Start background update checks. Fires immediately then every 24 hours.
     */
    public void checkInBackground() {
        scheduler.scheduleAtFixedRate(this::performCheck, 0, CHECK_INTERVAL_HOURS, TimeUnit.HOURS);
    }

    public void shutdown() {
        scheduler.shutdownNow();
    }

    private void performCheck() {
        try {
            String response = ApiService.get("/health", null);
            if (response == null) return;
            String latestVersion = parseVersion(response);
            if (latestVersion != null && isNewer(latestVersion, CURRENT_VERSION)) {
                LOG.info("Update available: " + latestVersion);
                if (onUpdateAvailable != null) {
                    onUpdateAvailable.accept(latestVersion);
                }
            }
        } catch (Exception e) {
            LOG.fine("Update check failed (offline?): " + e.getMessage());
        }
    }

    private String parseVersion(String healthJson) {
        try {
            String version = new ObjectMapper().readTree(healthJson).path("version").asText(null);
            return (version != null && !version.isEmpty()) ? version : null;
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isNewer(String candidate, String current) {
        int[] c = parseVersionParts(candidate);
        int[] cur = parseVersionParts(current);
        for (int i = 0; i < 3; i++) {
            if (c[i] > cur[i]) return true;
            if (c[i] < cur[i]) return false;
        }
        return false;
    }

    private int[] parseVersionParts(String version) {
        String[] parts = version.split("\\.");
        int[] result = new int[3];
        for (int i = 0; i < 3 && i < parts.length; i++) {
            try {
                result[i] = Integer.parseInt(parts[i].trim());
            } catch (NumberFormatException ignored) {
                result[i] = 0;
            }
        }
        return result;
    }
}
