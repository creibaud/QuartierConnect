package fr.quartierconnect.desktopapp.services;

import java.util.Properties;

/**
 * Resolves server URLs (API and SSO web app): system property ({@code -Dapi.url=...}),
 * then the {@code server.properties} bundled in the JAR, then local defaults.
 * JARs downloaded from a deployed instance bundle a server.properties pointing at it.
 */
public final class ServerConfig {

    private static final String DEFAULT_API_URL = "http://localhost:5000";
    private static final String DEFAULT_WEB_URL = "http://localhost:3001";
    private static final Properties BUNDLED = loadBundled();

    private ServerConfig() {}

    public static String apiUrl() {
        return resolve("api.url", DEFAULT_API_URL);
    }

    public static String webUrl() {
        return resolve("web.url", DEFAULT_WEB_URL);
    }

    private static String resolve(String key, String fallback) {
        String fromSystem = System.getProperty(key);
        if (fromSystem != null && !fromSystem.isBlank()) return fromSystem;
        String fromBundle = BUNDLED.getProperty(key);
        if (fromBundle != null && !fromBundle.isBlank()) return fromBundle;
        return fallback;
    }

    private static Properties loadBundled() {
        Properties properties = new Properties();
        try (var stream = ServerConfig.class.getResourceAsStream("/server.properties")) {
            if (stream != null) properties.load(stream);
        } catch (Exception ignored) {
            // missing or unreadable, defaults apply
        }
        return properties;
    }
}
