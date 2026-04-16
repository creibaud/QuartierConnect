package fr.quartierconnect.desktopapp.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

public class UsersService {

    public record UserSummary(String id, String email, String role, boolean banned) {}

    private static final ObjectMapper JSON = new ObjectMapper();

    public List<UserSummary> fetchUsers() {
        String token = AuthService.getInstance().getAccessToken();
        if (token == null) return List.of();

        try {
            String response = ApiService.get("/users?limit=200", token);
            JsonNode root = JSON.readTree(response);
            if (!root.isArray()) return List.of();

            List<UserSummary> result = new ArrayList<>();
            for (JsonNode node : root) {
                String id = node.path("_id").asText(null);
                String email = node.path("email").asText(null);
                if (id == null || email == null) continue;

                String role = node.path("role").asText("user");
                boolean banned = node.path("isBanned").asBoolean(false);
                result.add(new UserSummary(id, email, role, banned));
            }
            return result;
        } catch (Exception e) {
            return List.of();
        }
    }

    public void updateUser(String id, String jsonBody) throws Exception {
        String token = AuthService.getInstance().getAccessToken();
        ApiService.patch("/users/" + id, jsonBody, token);
    }

    public void banUser(String id, boolean ban) throws Exception {
        updateUser(id, "{\"isBanned\": " + ban + "}");
    }

    public void changeRole(String id, String role) throws Exception {
        updateUser(id, "{\"role\": \"" + role + "\"}");
    }
}
