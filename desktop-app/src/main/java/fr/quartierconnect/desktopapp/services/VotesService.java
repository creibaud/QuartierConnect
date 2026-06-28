package fr.quartierconnect.desktopapp.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import fr.quartierconnect.desktopapp.i18n.I18n;

import java.util.HashMap;
import java.util.Map;

public class VotesService {

    private static final ObjectMapper JSON = new ObjectMapper();

    public record VoteResult(boolean success, String error) {
        static VoteResult ok() { return new VoteResult(true, null); }
        static VoteResult fail(String error) { return new VoteResult(false, error); }
    }

    public VoteResult vote(String targetId, String targetType, String direction) {
        String token = AuthService.getInstance().getAccessToken();
        if (token == null) return VoteResult.fail(I18n.get("common.notAuthenticated"));

        try {
            Map<String, String> body = new HashMap<>();
            body.put("targetId", targetId);
            body.put("targetType", targetType);
            body.put("direction", direction);

            ApiService.post("/votes", JSON.writeValueAsString(body), token);
            return VoteResult.ok();
        } catch (Exception e) {
            return VoteResult.fail(e.getMessage());
        }
    }
}
