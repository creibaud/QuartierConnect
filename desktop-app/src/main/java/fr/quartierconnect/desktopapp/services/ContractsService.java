package fr.quartierconnect.desktopapp.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fr.quartierconnect.desktopapp.i18n.I18n;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class ContractsService {

    public record ContractSummary(
            String id,
            String title,
            String status,
            int signatureCount,
            int signatoryCount,
            boolean canSign
    ) {}

    private static final ObjectMapper JSON = new ObjectMapper();

    public List<ContractSummary> fetchContracts() {
        String token = AuthService.getInstance().getAccessToken();
        if (token == null) return List.of();

        String currentEmail = AuthService.getInstance().getCurrentUserEmail();

        try {
            String response = ApiService.get("/contracts", token);
            JsonNode root = JSON.readTree(response);
            if (!root.isArray()) return List.of();

            List<ContractSummary> result = new ArrayList<>();
            for (JsonNode node : root) {
                String id = node.path("_id").asText(null);
                String title = node.path("title").asText(null);
                if (id == null || title == null) continue;

                String status = node.path("status").asText("draft");

                Set<String> signedUserIds = new HashSet<>();
                for (JsonNode sig : node.path("signatures")) {
                    String userId = sig.path("userId").asText(null);
                    if (userId == null) userId = sig.asText(null);
                    if (userId != null) signedUserIds.add(userId);
                }

                Set<String> signatoryIds = new HashSet<>();
                for (JsonNode sig : node.path("signatories")) {
                    String sigId = sig.path("_id").asText(null);
                    if (sigId == null) sigId = sig.asText(null);
                    if (sigId != null) signatoryIds.add(sigId);
                }

                int signatureCount = signedUserIds.size();
                int signatoryCount = signatoryIds.size();
                boolean canSign = !status.equals("fully_signed") && !signatoryIds.isEmpty();

                result.add(new ContractSummary(id, title, status, signatureCount, signatoryCount, canSign));
            }
            return result;
        } catch (Exception e) {
            return List.of();
        }
    }

    public void signContract(String contractId, String totpCode) throws Exception {
        String token = AuthService.getInstance().getAccessToken();
        if (token == null) throw new RuntimeException(I18n.get("common.notAuthenticated"));

        Map<String, String> body = new HashMap<>();
        body.put("totpCode", totpCode);

        ApiService.post("/contracts/" + contractId + "/sign", JSON.writeValueAsString(body), token);
    }
}
