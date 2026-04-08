package fr.quartierconnect.desktopapp.services;

import fr.quartierconnect.desktopapp.database.SQLiteDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for AuthService offline-login and session-resume behaviour.
 * Uses a temp file SQLite database so connections share state between calls.
 */
class AuthServiceOfflineTest {

    private AuthService auth;

    private static String buildJwt(String email, long expEpochSeconds) {
        String header = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes());
        String payload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(("{\"sub\":\"user-1\",\"email\":\"" + email + "\",\"exp\":" + expEpochSeconds + "}").getBytes());
        return header + "." + payload + ".fakesig";
    }

    private static String validJwt(String email) {
        return buildJwt(email, (System.currentTimeMillis() / 1000L) + 3600);
    }

    private static String expiredJwt(String email) {
        return buildJwt(email, (System.currentTimeMillis() / 1000L) - 3600);
    }

    @BeforeEach
    void setUp() throws IOException {
        Path tmp = Files.createTempFile("qc-test-auth", ".db");
        tmp.toFile().deleteOnExit();
        System.setProperty("sqlite.url", "jdbc:sqlite:" + tmp.toAbsolutePath());
        SQLiteDatabase.initialize();

        auth = AuthService.getInstance();
        auth.clearSession(); // clears memory + SQLite
    }

    // ------------------------------------------------------------------
    // tryResumeFromDatabase — no session
    // ------------------------------------------------------------------

    @Test
    void tryResume_returnsFalse_whenNoSessionInDatabase() {
        assertFalse(auth.tryResumeFromDatabase());
        assertFalse(auth.isAuthenticated());
    }

    // ------------------------------------------------------------------
    // tryResumeFromDatabase — valid access token cached
    // ------------------------------------------------------------------

    @Test
    void tryResume_returnsTrue_whenValidAccessTokenCached() {
        String jwt = validJwt("alice@demo.fr");
        SQLiteDatabase.saveSession("alice@demo.fr", jwt, "refresh.token");

        assertTrue(auth.tryResumeFromDatabase());
        assertTrue(auth.isAuthenticated());
        assertEquals("alice@demo.fr", auth.getCurrentUserEmail());
    }

    // ------------------------------------------------------------------
    // tryResumeFromDatabase — expired access token but refresh token present
    // ------------------------------------------------------------------

    @Test
    void tryResume_returnsTrue_whenAccessTokenExpiredButRefreshTokenPresent() {
        String expired = expiredJwt("bob@demo.fr");
        SQLiteDatabase.saveSession("bob@demo.fr", expired, "valid.refresh.token");

        // Should still return true — offline-authenticated via refresh token
        assertTrue(auth.tryResumeFromDatabase());
    }

    @Test
    void tryResume_setsEmailFromDatabase_whenAccessTokenExpired() {
        String expired = expiredJwt("bob@demo.fr");
        SQLiteDatabase.saveSession("bob@demo.fr", expired, "valid.refresh.token");

        auth.tryResumeFromDatabase();
        // Even without a valid access token, email comes from the SQLite cached value
        assertEquals("bob@demo.fr", auth.getCurrentUserEmail());
    }

    @Test
    void tryResume_returnsFalse_whenBothTokensAbsent() {
        SQLiteDatabase.saveSession("ghost@demo.fr", null, null);

        assertFalse(auth.tryResumeFromDatabase());
        assertFalse(auth.isAuthenticated());
    }

    // ------------------------------------------------------------------
    // clearSession — also clears SQLite
    // ------------------------------------------------------------------

    @Test
    void clearSession_removesSessionFromDatabase() {
        String jwt = validJwt("alice@demo.fr");
        SQLiteDatabase.saveSession("alice@demo.fr", jwt, "refresh.token");

        auth.clearSession();

        // After clear, a fresh resume should find nothing
        assertFalse(auth.tryResumeFromDatabase());
        assertNull(SQLiteDatabase.loadSession());
    }

    // ------------------------------------------------------------------
    // isAuthenticated — offline mode (only refresh token in memory)
    // ------------------------------------------------------------------

    @Test
    void isAuthenticated_returnsTrue_whenOnlyRefreshTokenAvailable() throws Exception {
        // Simulate offline state: expired access + refresh in memory
        java.lang.reflect.Field refreshField = AuthService.class.getDeclaredField("refreshToken");
        refreshField.setAccessible(true);
        refreshField.set(auth, "some.refresh.token");

        // No valid access token — but isAuthenticated should still return true
        // because refresh token means we can reconnect when online
        assertTrue(auth.isAuthenticated());
    }

    // ------------------------------------------------------------------
    // refreshAccessToken — no network (no token set)
    // ------------------------------------------------------------------

    @Test
    void refreshAccessToken_returnsFalse_withNoRefreshToken() {
        auth.clearSession();
        assertFalse(auth.refreshAccessToken());
    }

    // ------------------------------------------------------------------
    // isTokenExpired — boundary cases
    // ------------------------------------------------------------------

    @Test
    void isTokenExpired_returnsTrue_forExpiredToken() {
        assertTrue(auth.isTokenExpired(expiredJwt("test@test.fr")));
    }

    @Test
    void isTokenExpired_returnsFalse_forValidToken() {
        assertFalse(auth.isTokenExpired(validJwt("test@test.fr")));
    }

    @Test
    void isTokenExpired_returnsTrue_forMalformedToken() {
        assertTrue(auth.isTokenExpired("not.a.jwt"));
        assertTrue(auth.isTokenExpired(""));
        assertTrue(auth.isTokenExpired(null));
    }

    // ------------------------------------------------------------------
    // getCurrentUserEmail — fallback chain
    // ------------------------------------------------------------------

    @Test
    void getCurrentUserEmail_fallsBackToCachedEmail_whenJwtUnavailable() {
        SQLiteDatabase.saveSession("offline@demo.fr", expiredJwt("offline@demo.fr"), "refresh");
        auth.tryResumeFromDatabase();

        // Access token is expired, but we should still get the email from the DB-cached value
        assertEquals("offline@demo.fr", auth.getCurrentUserEmail());
    }

    @Test
    void getCurrentUserEmail_returnsNull_whenNoSessionAtAll() {
        auth.clearSession();
        assertNull(auth.getCurrentUserEmail());
    }
}
