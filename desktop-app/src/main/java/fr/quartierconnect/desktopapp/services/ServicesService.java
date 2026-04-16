package fr.quartierconnect.desktopapp.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

public class ServicesService {

    public record ServiceSummary(
            String id,
            String title,
            String description,
            String neighborhoodId,
            String neighborhoodName,
            int upvotes,
            int downvotes,
            String userVote
    ) {}

    private static final ObjectMapper JSON = new ObjectMapper();

    public List<ServiceSummary> fetchServices() {
        String token = AuthService.getInstance().getAccessToken();
        if (token == null) return List.of();

        try {
            String response = ApiService.get("/services?limit=100", token);
            JsonNode root = JSON.readTree(response);
            if (!root.isArray()) return List.of();

            List<ServiceSummary> result = new ArrayList<>();
            for (JsonNode node : root) {
                String id = node.path("_id").asText(null);
                String title = node.path("title").asText(null);
                if (id == null || title == null) continue;

                String description = node.path("description").asText(null);
                String neighborhoodId = node.path("neighborhood").path("_id").asText(null);
                if (neighborhoodId == null) {
                    neighborhoodId = node.path("neighborhood").asText(null);
                }
                String neighborhoodName = node.path("neighborhood").path("name").asText(null);

                int upvotes = node.path("votes").path("up").asInt(0);
                int downvotes = node.path("votes").path("down").asInt(0);
                String userVote = node.path("userVote").asText(null);
                if ("null".equals(userVote)) userVote = null;

                result.add(new ServiceSummary(id, title, description,
                        neighborhoodId, neighborhoodName, upvotes, downvotes, userVote));
            }
            return result;
        } catch (Exception e) {
            return List.of();
        }
    }
}
