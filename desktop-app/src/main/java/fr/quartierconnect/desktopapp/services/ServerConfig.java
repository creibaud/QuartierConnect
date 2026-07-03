package fr.quartierconnect.desktopapp.services;

import java.util.Properties;

/**
 * Résout les URLs du serveur (API et application web SSO) dans cet ordre :
 * propriété système ({@code -Dapi.url=...}), puis fichier {@code server.properties}
 * embarqué dans le JAR, puis valeurs locales par défaut. Le JAR proposé au
 * téléchargement depuis une instance déployée embarque un {@code server.properties}
 * pointant vers cette instance, si bien qu'il fonctionne sans configuration.
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
            // Fichier absent ou illisible : on retombe sur les valeurs par défaut.
        }
        return properties;
    }
}
