package fr.quartierconnect.desktopapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import fr.quartierconnect.desktopapp.model.AuthSession;
import fr.quartierconnect.desktopapp.service.SessionManager;
import fr.quartierconnect.desktopapp.view.ViewManager;
import javafx.application.Platform;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Handles URI scheme callbacks (java-app://sso-callback).
 * Registers and processes OAuth-style SSO redirects from web app.
 */
public class URISchemeHandler {
    private static final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Registers the java-app:// URI scheme on supported platforms.
     * Linux: Creates .desktop file in ~/.local/share/applications/
     * macOS: Registers in LaunchServices via script
     * Windows: Registers in Registry via cmd
     */
    public static void registerURIScheme() {
        String os = System.getProperty("os.name").toLowerCase();
        
        if (os.contains("linux")) {
            registerLinuxURIScheme();
        } else if (os.contains("mac")) {
            registerMacURIScheme();
        } else if (os.contains("win")) {
            registerWindowsURIScheme();
        }
    }

    private static void registerLinuxURIScheme() {
        try {
            String home = System.getProperty("user.home");
            String appName = "quartierconnect";
            String jar = new java.io.File(
                URISchemeHandler.class.getProtectionDomain().getCodeSource().getLocation().toURI()
            ).getAbsolutePath();

            String desktopEntry = String.format(
                "[Desktop Entry]\n" +
                "Version=1.0\n" +
                "Type=Application\n" +
                "Name=QuartierConnect\n" +
                "Exec=java -jar %s %%u\n" +
                "MimeType=x-scheme-handler/java-app;\n",
                jar
            );

            java.nio.file.Path appsDir = java.nio.file.Paths.get(home, ".local", "share", "applications");
            java.nio.file.Files.createDirectories(appsDir);
            
            java.nio.file.Path desktopFile = appsDir.resolve(appName + ".desktop");
            java.nio.file.Files.write(desktopFile, desktopEntry.getBytes(StandardCharsets.UTF_8));
            
            System.out.println("✅ Linux URI scheme registered: " + desktopFile);
            
            // Update MIME type associations
            new ProcessBuilder("xdg-mime", "default", appName + ".desktop", "x-scheme-handler/java-app")
                .start()
                .waitFor();
        } catch (Exception e) {
            System.err.println("⚠️  Failed to register Linux URI scheme: " + e.getMessage());
        }
    }

    private static void registerMacURIScheme() {
        System.out.println("ℹ️  macOS URI scheme registration requires manual setup via Info.plist");
    }

    private static void registerWindowsURIScheme() {
        System.out.println("ℹ️  Windows URI scheme registration requires admin privileges");
    }

    /**
     * Processes URI scheme callback in format:
     * java-app://sso-callback?token=XXX&user=...
     */
    public static void processCallback(String uri) {
        try {
            System.out.println("📱 Processing SSO callback: " + uri);
            
            URI parsedUri = new URI(uri);
            String query = parsedUri.getRawQuery();
            
            if (query == null) {
                System.err.println("❌ No query params in URI");
                return;
            }

            Map<String, String> params = parseQueryString(query);
            String accessToken = params.get("token");
            String userJson = params.get("user");

            if (accessToken == null || userJson == null) {
                System.err.println("❌ Missing token or user in callback");
                return;
            }

            // Create session from callback params
            AuthSession session = new AuthSession();
            session.setAccessToken(accessToken);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> userMap = objectMapper.readValue(
                URLDecoder.decode(userJson, StandardCharsets.UTF_8),
                Map.class
            );
            AuthSession.UserInfo userInfo = objectMapper.convertValue(userMap, AuthSession.UserInfo.class);
            session.setUser(userInfo);

            // Save session and show dashboard
            SessionManager.saveSession(session);
            Platform.runLater(() -> {
                ViewManager.getInstance().showDashboard(session);
            });
            
            System.out.println("✅ SSO callback processed: user " + userInfo.getEmail());
        } catch (Exception e) {
            System.err.println("❌ Error processing SSO callback: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Parse URL query string into Map<name, value>
     */
    private static Map<String, String> parseQueryString(String query) {
        Map<String, String> params = new java.util.HashMap<>();
        if (query == null || query.isEmpty()) return params;

        for (String param : query.split("&")) {
            String[] parts = param.split("=", 2);
            if (parts.length == 2) {
                try {
                    params.put(
                        URLDecoder.decode(parts[0], StandardCharsets.UTF_8),
                        URLDecoder.decode(parts[1], StandardCharsets.UTF_8)
                    );
                } catch (Exception e) {
                    System.err.println("⚠️  Failed to decode param: " + param);
                }
            }
        }
        return params;
    }
}
