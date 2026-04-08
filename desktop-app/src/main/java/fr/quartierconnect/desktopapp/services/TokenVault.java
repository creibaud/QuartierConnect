package fr.quartierconnect.desktopapp.services;

import com.github.javakeyring.BackendNotSupportedException;
import com.github.javakeyring.Keyring;
import com.github.javakeyring.PasswordAccessException;

import java.util.logging.Logger;

public class TokenVault {

    private static final Logger log = Logger.getLogger(TokenVault.class.getName());
    private static final String SERVICE = "QuartierConnect";
    private static final String ACCOUNT_ACCESS = "access_token";
    private static final String ACCOUNT_REFRESH = "refresh_token";

    private static volatile TokenVault instance;

    private final Keyring keyring;

    private volatile String memoryAccessToken;
    private volatile String memoryRefreshToken;

    private TokenVault() {
        Keyring kr = null;
        try {
            kr = Keyring.create();
            log.info("TokenVault: OS keychain active (" + kr.getClass().getSimpleName() + ")");
        } catch (BackendNotSupportedException e) {
            log.warning("TokenVault: OS keychain unavailable — tokens held in memory only. " + e.getMessage());
        }
        this.keyring = kr;
    }

    public static synchronized TokenVault getInstance() {
        if (instance == null) instance = new TokenVault();
        return instance;
    }

    public record TokenPair(String accessToken, String refreshToken) {}

    public void saveTokens(String accessToken, String refreshToken) {
        if (keyring != null) {
            try {
                keyring.setPassword(SERVICE, ACCOUNT_ACCESS, accessToken != null ? accessToken : "");
                keyring.setPassword(SERVICE, ACCOUNT_REFRESH, refreshToken != null ? refreshToken : "");
                return;
            } catch (PasswordAccessException e) {
                log.warning("TokenVault: keychain write failed, using memory: " + e.getMessage());
            }
        }
        memoryAccessToken = accessToken;
        memoryRefreshToken = refreshToken;
    }

    public TokenPair loadTokens() {
        if (keyring != null) {
            try {
                String access = safeRead(ACCOUNT_ACCESS);
                String refresh = safeRead(ACCOUNT_REFRESH);
                if (access == null && refresh == null) return null;
                return new TokenPair(
                        access != null && !access.isEmpty() ? access : null,
                        refresh != null && !refresh.isEmpty() ? refresh : null
                );
            } catch (Exception e) {
                log.warning("TokenVault: keychain read error, falling back to memory: " + e.getMessage());
            }
        }
        if (memoryAccessToken == null && memoryRefreshToken == null) return null;
        return new TokenPair(memoryAccessToken, memoryRefreshToken);
    }

    public void clearTokens() {
        if (keyring != null) {
            try { keyring.deletePassword(SERVICE, ACCOUNT_ACCESS); } catch (PasswordAccessException ignored) {}
            try { keyring.deletePassword(SERVICE, ACCOUNT_REFRESH); } catch (PasswordAccessException ignored) {}
        }
        memoryAccessToken = null;
        memoryRefreshToken = null;
    }

    private String safeRead(String account) {
        try {
            String value = keyring.getPassword(SERVICE, account);
            return (value == null || value.isEmpty()) ? null : value;
        } catch (PasswordAccessException e) {
            return null;
        }
    }
}
