package fr.quartierconnect.desktopapp.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fr.quartierconnect.desktopapp.database.SQLiteDatabase;

import java.util.Base64;
import java.util.logging.Logger;

public class AuthService {

    private static final Logger log = Logger.getLogger(AuthService.class.getName());
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private volatile String accessToken;
    private volatile String refreshToken;
    /** Email from the JWT payload — cached so it is available even when offline. */
    private volatile String cachedEmail;

    private static volatile AuthService instance;

    private AuthService() {}

    public static synchronized AuthService getInstance() {
        if (instance == null) instance = new AuthService();
        return instance;
    }

    public record LoginResult(String accessToken, String refreshToken) {}

    // ------------------------------------------------------------------
    // Online login flows
    // ------------------------------------------------------------------

    public LoginResult login(String email, String password, String totpCode) throws Exception {
        String body = MAPPER.writeValueAsString(new java.util.HashMap<>() {{
            put("email", email);
            put("password", password);
            put("totpCode", totpCode);
        }});

        String response = ApiService.post("/auth/login", body, null);
        JsonNode node = MAPPER.readTree(response);

        applyTokens(node.get("accessToken").asText(), node.get("refreshToken").asText());
        return new LoginResult(accessToken, refreshToken);
    }

    public LoginResult exchangeSsoToken(String ssoToken, String state) throws Exception {
        String body = MAPPER.writeValueAsString(new java.util.HashMap<>() {{
            put("ssoToken", ssoToken);
            put("state", state);
        }});

        String response = ApiService.post("/auth/sso/exchange", body, null);
        JsonNode node = MAPPER.readTree(response);

        applyTokens(node.get("accessToken").asText(), node.get("refreshToken").asText());
        return new LoginResult(accessToken, refreshToken);
    }

    // ------------------------------------------------------------------
    // Offline / session-resume flows
    // ------------------------------------------------------------------

    /**
     * Try to resume a session from persistent storage without any network call.
     * Email is restored from SQLite; tokens are restored from the OS keychain via TokenVault.
     *
     * @return true if a valid (non-expired) access token was restored, or if only a refresh
     *         token is available (offline-mode — caller should trigger a background refresh
     *         when connectivity returns).
     */
    public boolean tryResumeFromDatabase() {
        SQLiteDatabase.SessionRecord emailRecord = SQLiteDatabase.loadSession();
        TokenVault.TokenPair tokens = TokenVault.getInstance().loadTokens();

        if (emailRecord == null && tokens == null) return false;

        if (emailRecord != null) cachedEmail = emailRecord.email();

        if (tokens != null) {
            refreshToken = tokens.refreshToken();
            if (tokens.accessToken() != null && !isTokenExpired(tokens.accessToken())) {
                accessToken = tokens.accessToken();
                return true;
            }
        }

        return refreshToken != null;
    }

    /**
     * Attempt to get a fresh token pair using the stored refresh token.
     * Persists the new pair on success.
     *
     * @return true if the refresh succeeded.
     */
    public boolean refreshAccessToken() {
        try {
            if (refreshToken == null) return false;

            String body = MAPPER.writeValueAsString(new java.util.HashMap<>() {{
                put("refreshToken", refreshToken);
            }});

            String response = ApiService.post("/auth/refresh", body, null);
            JsonNode node = MAPPER.readTree(response);

            applyTokens(node.get("accessToken").asText(), node.get("refreshToken").asText());
            return true;
        } catch (Exception e) {
            log.warning("Token refresh failed: " + e.getMessage());
            // Do NOT clear session here — we may be offline; keep the cached state
            return false;
        }
    }

    // ------------------------------------------------------------------
    // Accessors
    // ------------------------------------------------------------------

    public String getAccessToken() {
        return accessToken;
    }

    public boolean isAuthenticated() {
        return (accessToken != null && !isTokenExpired(accessToken))
                || (refreshToken != null); // offline-authenticated
    }

    /**
     * Returns the user's email. Falls back to the SQLite-cached email if the JWT
     * is unavailable (e.g., after startup without network).
     */
    public String getCurrentUserEmail() {
        String fromJwt = extractEmailFromJwt(accessToken);
        return fromJwt != null ? fromJwt : cachedEmail;
    }

    public String getCurrentUserId() {
        JsonNode payload = parseJwtPayload(accessToken);
        if (payload == null) return null;
        return payload.has("sub") ? payload.get("sub").asText() : null;
    }

    public String getCurrentUserRole() {
        JsonNode payload = parseJwtPayload(accessToken);
        if (payload == null) return null;
        return payload.has("role") ? payload.get("role").asText() : null;
    }

    public long getTokenExpiryEpochSeconds() {
        JsonNode payload = parseJwtPayload(accessToken);
        if (payload == null) return 0;
        return payload.has("exp") ? payload.get("exp").asLong() : 0;
    }

    public void clearSession() {
        accessToken = null;
        refreshToken = null;
        cachedEmail = null;
        TokenVault.getInstance().clearTokens();
        SQLiteDatabase.clearSession();
    }

    // ------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------

    private void applyTokens(String newAccessToken, String newRefreshToken) {
        accessToken = newAccessToken;
        refreshToken = newRefreshToken;
        cachedEmail = extractEmailFromJwt(newAccessToken);
        TokenVault.getInstance().saveTokens(newAccessToken, newRefreshToken);
        SQLiteDatabase.saveSession(cachedEmail != null ? cachedEmail : "");
    }

    private String extractEmailFromJwt(String token) {
        JsonNode payload = parseJwtPayload(token);
        if (payload == null) return null;
        return payload.has("email") ? payload.get("email").asText() : null;
    }

    public boolean isTokenExpired(String token) {
        JsonNode payload = parseJwtPayload(token);
        if (payload == null) return true;
        long exp = payload.has("exp") ? payload.get("exp").asLong() : 0;
        return exp * 1000L < System.currentTimeMillis();
    }

    private JsonNode parseJwtPayload(String token) {
        if (token == null) return null;
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return null;
            String decoded = new String(Base64.getUrlDecoder().decode(parts[1]));
            return MAPPER.readTree(decoded);
        } catch (Exception e) {
            return null;
        }
    }
}
