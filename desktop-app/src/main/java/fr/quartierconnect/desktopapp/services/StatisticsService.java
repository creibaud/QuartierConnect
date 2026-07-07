package fr.quartierconnect.desktopapp.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fr.quartierconnect.desktopapp.database.IncidentRepository;

import java.sql.SQLException;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Aggregates local (SQLite) and remote (API) statistics.
 * Remote stats require a valid token; falls back to local-only on failure.
 */
public class StatisticsService {

    private static final Logger LOG = Logger.getLogger(StatisticsService.class.getName());

    public record Stats(
            int localTotal,
            int localDirty,
            int localSynced,
            int localOpen,
            int localInProgress,
            int localResolved,
            Integer remoteUsers,
            Integer remoteIncidents,
            Integer remoteNeighborhoods,
            Integer remoteActiveIncidents
    ) {}

    private static final ObjectMapper JSON = new ObjectMapper();
    private final IncidentRepository incidentRepo = new IncidentRepository();

    public Stats computeStats() {
        int localTotal = 0, localDirty = 0, localSynced = 0;
        int localOpen = 0, localInProgress = 0, localResolved = 0;

        try {
            List<IncidentRepository.Incident> all = incidentRepo.listAll();
            localTotal = all.size();
            for (IncidentRepository.Incident inc : all) {
                if (inc.isDirty()) localDirty++;
                else localSynced++;
                switch (inc.status()) {
                    case "open" -> localOpen++;
                    case "in_progress" -> localInProgress++;
                    case "resolved" -> localResolved++;
                }
            }
        } catch (SQLException e) {
            // local db unavailable, keep zeros
        }

        Integer remoteUsers = null, remoteIncidents = null;
        Integer remoteNeighborhoods = null, remoteActiveIncidents = null;

        String token = AuthService.getInstance().getAccessToken();
        if (token != null) {
            try {
                String response = ApiService.get("/stats", token);
                JsonNode root = JSON.readTree(response);
                remoteUsers = readCounter(root, "users");
                remoteIncidents = readCounter(root, "incidents");
                remoteNeighborhoods = readCounter(root, "neighborhoods");
                remoteActiveIncidents = readCounter(root, "activeIncidents");
            } catch (Exception e) {
                // API unreachable or non-admin token
                LOG.log(Level.FINE, "Remote stats unavailable", e);
            }
        }

        return new Stats(
                localTotal, localDirty, localSynced,
                localOpen, localInProgress, localResolved,
                remoteUsers, remoteIncidents, remoteNeighborhoods, remoteActiveIncidents
        );
    }

    /** The API returns {@code null} for a counter whose backing store is down — keep null, not 0. */
    static Integer readCounter(JsonNode root, String field) {
        JsonNode node = root.get(field);
        return node != null && node.isNumber() ? node.intValue() : null;
    }
}
