package fr.quartierconnect.desktopapp.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for TokenVault token persistence.
 * In CI/test environments the OS keychain (SecretService/Keychain) is unavailable,
 * so TokenVault falls back to in-memory storage — which is exactly what we test here.
 * The in-memory path exercises the same public API as the keychain path.
 */
class TokenVaultTest {

    private TokenVault vault;

    @BeforeEach
    void setUp() {
        vault = TokenVault.getInstance();
        vault.clearTokens();
    }

    @Test
    void loadTokens_returnsNull_whenNoTokensSaved() {
        assertNull(vault.loadTokens());
    }

    @Test
    void saveAndLoad_roundTrip_returnsCorrectPair() {
        vault.saveTokens("access.token.123", "refresh.token.456");

        TokenVault.TokenPair pair = vault.loadTokens();
        assertNotNull(pair);
        assertEquals("access.token.123", pair.accessToken());
        assertEquals("refresh.token.456", pair.refreshToken());
    }

    @Test
    void saveTokens_overwrites_previousTokens() {
        vault.saveTokens("old.access", "old.refresh");
        vault.saveTokens("new.access", "new.refresh");

        TokenVault.TokenPair pair = vault.loadTokens();
        assertNotNull(pair);
        assertEquals("new.access", pair.accessToken());
        assertEquals("new.refresh", pair.refreshToken());
    }

    @Test
    void clearTokens_removesAllStoredTokens() {
        vault.saveTokens("access.token", "refresh.token");
        vault.clearTokens();

        assertNull(vault.loadTokens());
    }

    @Test
    void saveTokens_withNullAccessToken_returnsNullAccessToken() {
        vault.saveTokens(null, "refresh.only");

        TokenVault.TokenPair pair = vault.loadTokens();
        assertNotNull(pair);
        assertNull(pair.accessToken());
        assertEquals("refresh.only", pair.refreshToken());
    }

    @Test
    void saveTokens_withNullRefreshToken_returnsNullRefreshToken() {
        vault.saveTokens("access.only", null);

        TokenVault.TokenPair pair = vault.loadTokens();
        assertNotNull(pair);
        assertEquals("access.only", pair.accessToken());
        assertNull(pair.refreshToken());
    }

    @Test
    void saveTokens_withBothNull_loadTokensReturnsNull() {
        // Saving explicit nulls is treated as clearing — no tokens to return
        vault.saveTokens(null, null);

        assertNull(vault.loadTokens());
    }

    @Test
    void clearTokens_isIdempotent_whenNoTokensSaved() {
        assertDoesNotThrow(() -> vault.clearTokens());
        assertDoesNotThrow(() -> vault.clearTokens());
        assertNull(vault.loadTokens());
    }

    @Test
    void loadTokens_afterMultipleSaves_returnsLastSavedPair() {
        vault.saveTokens("first.access", "first.refresh");
        vault.saveTokens("second.access", "second.refresh");
        vault.saveTokens("third.access", "third.refresh");

        TokenVault.TokenPair pair = vault.loadTokens();
        assertNotNull(pair);
        assertEquals("third.access", pair.accessToken());
        assertEquals("third.refresh", pair.refreshToken());
    }

    @Test
    void saveAndClearAndSave_returnsNewTokens() {
        vault.saveTokens("first.access", "first.refresh");
        vault.clearTokens();
        vault.saveTokens("second.access", "second.refresh");

        TokenVault.TokenPair pair = vault.loadTokens();
        assertNotNull(pair);
        assertEquals("second.access", pair.accessToken());
        assertEquals("second.refresh", pair.refreshToken());
    }
}
