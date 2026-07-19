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
 * Offline login and session-resume tests. Email lives in SQLite, tokens in TokenVault
 * (in-memory fallback under CI). Uses a temp-file DB so connections share state.
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
        auth.clearSession(); // clears memory + TokenVault + SQLite
    }

    @Test
    void tryResume_returnsFalse_whenNoSessionInDatabase() {
        assertFalse(auth.tryResumeFromDatabase());
        assertFalse(auth.isAuthenticated());
    }

    @Test
    void tryResume_returnsTrue_whenValidAccessTokenCached() {
        String jwt = validJwt("alice@demo.fr");
        SQLiteDatabase.saveSession("alice@demo.fr");
        TokenVault.getInstance().saveTokens(jwt, "refresh.token");

        assertTrue(auth.tryResumeFromDatabase());
        assertTrue(auth.isAuthenticated());
        assertEquals("alice@demo.fr", auth.getCurrentUserEmail());
    }

    @Test
    void tryResume_returnsTrue_whenAccessTokenExpiredButRefreshTokenPresent() {
        SQLiteDatabase.saveSession("bob@demo.fr");
        TokenVault.getInstance().saveTokens(expiredJwt("bob@demo.fr"), "valid.refresh.token");

        assertTrue(auth.tryResumeFromDatabase());
    }

    @Test
    void tryResume_setsEmailFromDatabase_whenAccessTokenExpired() {
        SQLiteDatabase.saveSession("bob@demo.fr");
        TokenVault.getInstance().saveTokens(expiredJwt("bob@demo.fr"), "valid.refresh.token");

        auth.tryResumeFromDatabase();
        assertEquals("bob@demo.fr", auth.getCurrentUserEmail());
    }

    @Test
    void tryResume_returnsFalse_whenNoTokensStored() {
        SQLiteDatabase.saveSession("ghost@demo.fr");
        // no tokens in the vault

        assertFalse(auth.tryResumeFromDatabase());
        assertFalse(auth.isAuthenticated());
    }

    @Test
    void clearSession_removesSessionFromDatabase() {
        String jwt = validJwt("alice@demo.fr");
        SQLiteDatabase.saveSession("alice@demo.fr");
        TokenVault.getInstance().saveTokens(jwt, "refresh.token");

        auth.clearSession();

        assertFalse(auth.tryResumeFromDatabase());
        assertNull(SQLiteDatabase.loadSession());
        assertNull(TokenVault.getInstance().loadTokens());
    }

    @Test
    void isAuthenticated_returnsTrue_whenOnlyRefreshTokenAvailable() throws Exception {
        java.lang.reflect.Field refreshField = AuthService.class.getDeclaredField("refreshToken");
        refreshField.setAccessible(true);
        refreshField.set(auth, "some.refresh.token");

        assertTrue(auth.isAuthenticated());
    }

    @Test
    void refreshAccessToken_returnsFalse_withNoRefreshToken() {
        auth.clearSession();
        assertFalse(auth.refreshAccessToken());
    }

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

    @Test
    void getCurrentUserEmail_fallsBackToCachedEmail_whenJwtUnavailable() {
        SQLiteDatabase.saveSession("offline@demo.fr");
        TokenVault.getInstance().saveTokens(expiredJwt("offline@demo.fr"), "refresh");
        auth.tryResumeFromDatabase();

        assertEquals("offline@demo.fr", auth.getCurrentUserEmail());
    }

    @Test
    void getCurrentUserEmail_returnsNull_whenNoSessionAtAll() {
        auth.clearSession();
        assertNull(auth.getCurrentUserEmail());
    }
}
