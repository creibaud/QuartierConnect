package fr.quartierconnect.desktopapp.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

public class EventsService {

    public record EventSummary(String id, String title, String date, String location) {}

    private static final ObjectMapper JSON = new ObjectMapper();

    public List<EventSummary> fetchEvents() {
        String token = AuthService.getInstance().getAccessToken();
        if (token == null) return List.of();

        try {
            String response = ApiService.get("/events?limit=100", token);
            JsonNode root = JSON.readTree(response);
            if (!root.isArray()) return List.of();

            List<EventSummary> result = new ArrayList<>();
            for (JsonNode node : root) {
                String id = node.path("_id").asText(null);
                String title = node.path("title").asText(null);
                if (id != null && title != null) {
                    String date = node.path("date").asText(null);
                    String location = node.path("location").asText(null);
                    result.add(new EventSummary(id, title, date, location));
                }
            }
            return result;
        } catch (Exception e) {
            return List.of();
        }
    }
}
