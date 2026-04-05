package fr.quartierconnect.desktopapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import fr.quartierconnect.desktopapp.model.AuthSession;
import fr.quartierconnect.desktopapp.view.ViewManager;
import javafx.application.Platform;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public class SSOCallbackHandler {
    private static HttpServer server;
    private static final int PORT = 9091;
    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static void start() {
        try {
            server = HttpServer.create(new InetSocketAddress("0.0.0.0", PORT), 10);

            server.createContext("/sso-callback", exchange -> {
                if ("GET".equals(exchange.getRequestMethod())) {
                    handleCallback(exchange);
                } else if ("OPTIONS".equals(exchange.getRequestMethod())) {
                    sendResponse(exchange, 204, "");
                }
            });

            server.setExecutor(java.util.concurrent.Executors.newFixedThreadPool(2));
            server.start();
            System.out.println("✅ SSO Callback handler started on http://localhost:" + PORT);
        } catch (IOException e) {
            System.err.println("❌ Failed to start SSO callback handler: " + e.getMessage());
        }
    }

    public static void stop() {
        if (server != null) {
            server.stop(0);
            System.out.println("✅ SSO Callback handler stopped");
        }
    }

    private static void handleCallback(HttpExchange exchange) throws IOException {
        try {
            URI requestURI = exchange.getRequestURI();
            String query = requestURI.getQuery();

            if (query == null) {
                sendResponse(exchange, 400, "Missing parameters");
                return;
            }

            Map<String, String> params = parseQueryString(query);
            String accessToken = params.get("token");
            String userJson = params.get("user");

            if (accessToken == null || userJson == null) {
                sendResponse(exchange, 400, "Missing token or user");
                return;
            }

            AuthSession session = new AuthSession();
            session.setAccessToken(accessToken);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> userMap = objectMapper.readValue(
                URLDecoder.decode(userJson, StandardCharsets.UTF_8),
                Map.class
            );
            AuthSession.UserInfo userInfo = objectMapper.convertValue(userMap, AuthSession.UserInfo.class);
            session.setUser(userInfo);

            SessionManager.saveSession(session);

            Platform.runLater(() -> {
                ViewManager.getInstance().showDashboard(session);
            });

            String html = "<!DOCTYPE html><html><body style='font-family:Arial;text-align:center;padding:50px'>" +
                "<h1>✅ Login successful!</h1>" +
                "<p>You can close this window. The desktop app is now logged in.</p>" +
                "<script>setTimeout(() => window.close(), 3000);</script>" +
                "</body></html>";

            sendResponse(exchange, 200, html, "text/html");

            System.out.println("✅ SSO callback successful - user logged in");
        } catch (Exception e) {
            System.err.println("❌ SSO callback error: " + e.getMessage());
            sendResponse(exchange, 500, "Error processing callback: " + e.getMessage());
        }
    }

    private static Map<String, String> parseQueryString(String query) {
        Map<String, String> params = new HashMap<>();
        for (String pair : query.split("&")) {
            String[] keyValue = pair.split("=", 2);
            if (keyValue.length == 2) {
                try {
                    String key = URLDecoder.decode(keyValue[0], StandardCharsets.UTF_8);
                    String value = URLDecoder.decode(keyValue[1], StandardCharsets.UTF_8);
                    params.put(key, value);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
        return params;
    }

    private static void sendResponse(HttpExchange exchange, int statusCode, String body) throws IOException {
        sendResponse(exchange, statusCode, body, "text/plain");
    }

    private static void sendResponse(HttpExchange exchange, int statusCode, String body, String contentType) throws IOException {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
        exchange.getResponseHeaders().add("Content-Type", contentType + "; charset=utf-8");

        byte[] response = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, response.length);

        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response);
        }

        exchange.close();
    }
}
