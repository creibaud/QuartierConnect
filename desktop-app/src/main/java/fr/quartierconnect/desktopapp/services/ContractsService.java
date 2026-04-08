package fr.quartierconnect.desktopapp.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

public class ContractsService {

    public record ContractSummary(
            String id,
            String title,
            String status,
            int signatureCount,
            int signatoryCount
    ) {}

    private static final ObjectMapper JSON = new ObjectMapper();

    public List<ContractSummary> fetchContracts() {
        String token = AuthService.getInstance().getAccessToken();
        if (token == null) return List.of();

        try {
            String response = ApiService.get("/contracts", token);
            JsonNode root = JSON.readTree(response);
            if (!root.isArray()) return List.of();

            List<ContractSummary> result = new ArrayList<>();
            for (JsonNode node : root) {
                String id = node.path("_id").asText(null);
                String title = node.path("title").asText(null);
                if (id != null && title != null) {
                    String status = node.path("status").asText("draft");
                    int signatureCount = node.path("signatures").size();
                    int signatoryCount = node.path("signatories").size();
                    result.add(new ContractSummary(id, title, status, signatureCount, signatoryCount));
                }
            }
            return result;
        } catch (Exception e) {
            return List.of();
        }
    }
}
