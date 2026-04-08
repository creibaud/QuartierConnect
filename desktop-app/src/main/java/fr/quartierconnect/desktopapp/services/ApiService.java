package fr.quartierconnect.desktopapp.services;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class ApiService {

    private static String getBaseUrl() {
        return System.getProperty("api.url", "http://localhost:5000");
    }
    private static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .version(HttpClient.Version.HTTP_1_1)
            .build();

    public static String post(String path, String jsonBody, String bearerToken) throws Exception {
        return post(path, jsonBody, bearerToken, false);
    }

    private static String post(String path, String jsonBody, String bearerToken, boolean retried) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(getBaseUrl() + path))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json");

        if (bearerToken != null) {
            builder.header("Authorization", "Bearer " + bearerToken);
        }

        HttpRequest request = builder
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        HttpResponse<String> response = CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 401) {
            if (!retried) {
                boolean refreshed = AuthService.getInstance().refreshAccessToken();
                if (refreshed) {
                    return post(path, jsonBody, AuthService.getInstance().getAccessToken(), true);
                }
            }
            throw new RuntimeException("Session expirée");
        }

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("API error " + response.statusCode() + ": " + response.body());
        }

        return response.body();
    }

    /**
     * Quick reachability check against GET /health.
     * Returns true if the API responds with 2xx within 3 seconds.
     */
    public static boolean isReachable() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(getBaseUrl() + "/health"))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();
            HttpResponse<Void> response = CLIENT.send(request, HttpResponse.BodyHandlers.discarding());
            return response.statusCode() >= 200 && response.statusCode() < 300;
        } catch (Exception e) {
            return false;
        }
    }

    public static String get(String path, String bearerToken) throws Exception {
        return get(path, bearerToken, false);
    }

    private static String get(String path, String bearerToken, boolean retried) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(getBaseUrl() + path))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json");

        if (bearerToken != null) {
            builder.header("Authorization", "Bearer " + bearerToken);
        }

        HttpRequest request = builder.GET().build();
        HttpResponse<String> response = CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 401) {
            if (!retried) {
                boolean refreshed = AuthService.getInstance().refreshAccessToken();
                if (refreshed) {
                    return get(path, AuthService.getInstance().getAccessToken(), true);
                }
            }
            throw new RuntimeException("Session expirée");
        }

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("API error " + response.statusCode() + ": " + response.body());
        }

        return response.body();
    }
}
