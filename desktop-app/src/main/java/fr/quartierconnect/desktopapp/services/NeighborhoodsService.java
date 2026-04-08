package fr.quartierconnect.desktopapp.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

public class NeighborhoodsService {

    public record NeighborhoodSummary(String id, String name) {}

    private static final ObjectMapper JSON = new ObjectMapper();

    public List<NeighborhoodSummary> fetchNeighborhoods() {
        String token = AuthService.getInstance().getAccessToken();
        if (token == null) return List.of();

        try {
            String response = ApiService.get("/neighborhoods?limit=100", token);
            JsonNode root = JSON.readTree(response);
            if (!root.isArray()) return List.of();

            List<NeighborhoodSummary> result = new ArrayList<>();
            for (JsonNode node : root) {
                String id = node.path("_id").asText(null);
                String name = node.path("name").asText(null);
                if (id != null && name != null) {
                    result.add(new NeighborhoodSummary(id, name));
                }
            }
            return result;
        } catch (Exception e) {
            return List.of();
        }
    }
}
