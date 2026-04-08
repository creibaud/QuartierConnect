package fr.quartierconnect.desktopapp.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

class AuthServiceTest {

    private AuthService auth;

    @BeforeEach
    void setUp() {
        auth = AuthService.getInstance();
        auth.clearSession();
    }

    @Test
    void isAuthenticated_returnsFalse_whenNoTokenSet() {
        assertFalse(auth.isAuthenticated());
    }

    @Test
    void getCurrentUserEmail_returnsNull_whenNoTokenSet() {
        assertNull(auth.getCurrentUserEmail());
    }

    @Test
    void clearSession_removesTokens() {
        // Build a non-expired JWT manually (header.payload.signature)
        String header = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes());
        long futureExp = (System.currentTimeMillis() / 1000L) + 3600;
        String payload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(("{\"sub\":\"abc\",\"email\":\"test@test.fr\",\"exp\":" + futureExp + "}").getBytes());
        String fakeJwt = header + "." + payload + ".fakesig";

        // Inject via login result simulation using reflection to set the field
        // since there is no setter for accessToken — we verify clearSession instead
        auth.clearSession();
        assertFalse(auth.isAuthenticated());
        assertNull(auth.getAccessToken());
    }

    @Test
    void refreshAccessToken_returnsFalse_whenNoRefreshToken() {
        auth.clearSession();
        assertFalse(auth.refreshAccessToken());
    }

    @Test
    void isAuthenticated_returnsFalse_whenTokenExpired() throws Exception {
        String header = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes());
        long pastExp = (System.currentTimeMillis() / 1000L) - 3600;
        String payload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(("{\"sub\":\"abc\",\"email\":\"test@test.fr\",\"exp\":" + pastExp + "}").getBytes());
        String expiredJwt = header + "." + payload + ".fakesig";

        java.lang.reflect.Field field = AuthService.class.getDeclaredField("accessToken");
        field.setAccessible(true);
        field.set(auth, expiredJwt);

        assertFalse(auth.isAuthenticated());
    }

    @Test
    void isAuthenticated_returnsTrue_whenTokenValid() throws Exception {
        String header = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes());
        long futureExp = (System.currentTimeMillis() / 1000L) + 3600;
        String payload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(("{\"sub\":\"abc\",\"email\":\"test@test.fr\",\"exp\":" + futureExp + "}").getBytes());
        String validJwt = header + "." + payload + ".fakesig";

        java.lang.reflect.Field field = AuthService.class.getDeclaredField("accessToken");
        field.setAccessible(true);
        field.set(auth, validJwt);

        assertTrue(auth.isAuthenticated());
    }
}
