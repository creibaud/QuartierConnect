package fr.quartierconnect.desktopapp.services;

import javafx.application.Platform;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

public class ApiService {

    private static volatile boolean offlineMode = false;
    private static final List<Consumer<Boolean>> offlineModeListeners = new CopyOnWriteArrayList<>();

    public static void setOfflineMode(boolean offline) {
        offlineMode = offline;
        Platform.runLater(() -> offlineModeListeners.forEach(l -> l.accept(offline)));
    }

    public static boolean isOfflineMode() { return offlineMode; }

    public static void addOfflineModeListener(Consumer<Boolean> listener) {
        offlineModeListeners.add(listener);
    }

    public static void removeOfflineModeListener(Consumer<Boolean> listener) {
        offlineModeListeners.remove(listener);
    }

    private static String getBaseUrl() {
        return System.getProperty("api.url", "http://localhost:5000");
    }
    private static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .version(HttpClient.Version.HTTP_1_1)
            .build();

    public static String post(String path, String jsonBody, String bearerToken) throws Exception {
        return execute("POST", path, jsonBody, bearerToken, false);
    }

    public static String patch(String path, String jsonBody, String bearerToken) throws Exception {
        return execute("PATCH", path, jsonBody, bearerToken, false);
    }

    public static String delete(String path, String bearerToken) throws Exception {
        return execute("DELETE", path, null, bearerToken, false);
    }

    public static String get(String path, String bearerToken) throws Exception {
        return execute("GET", path, null, bearerToken, false);
    }

    public static boolean isReachable() {
        if (offlineMode) return false;
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(getBaseUrl() + "/health"))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();
            CLIENT.send(request, HttpResponse.BodyHandlers.discarding());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private static String execute(String method, String path, String jsonBody,
                                   String bearerToken, boolean retried) throws Exception {
        if (offlineMode) throw new java.io.IOException("Mode hors ligne activé");

        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(getBaseUrl() + path))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json");

        if (bearerToken != null) {
            builder.header("Authorization", "Bearer " + bearerToken);
        }

        HttpRequest.BodyPublisher body = jsonBody != null
                ? HttpRequest.BodyPublishers.ofString(jsonBody)
                : HttpRequest.BodyPublishers.noBody();

        HttpResponse<String> response = CLIENT.send(
                builder.method(method, body).build(),
                HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 401 && !retried) {
            if (AuthService.getInstance().refreshAccessToken()) {
                return execute(method, path, jsonBody,
                        AuthService.getInstance().getAccessToken(), true);
            }
            throw new RuntimeException("Session expirée");
        }

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Erreur API — " + response.statusCode());
        }

        return response.body();
    }
}
