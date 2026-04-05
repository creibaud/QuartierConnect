package fr.quartierconnect.desktopapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import fr.quartierconnect.desktopapp.model.AuthSession;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * SessionServer - Serveur HTTP local pour partager les sessions SSO entre desktop et web.
 * Écoute sur localhost:9090 pour permettre au web app de synchroniser les sessions.
 * 
 * Endpoints:
 * - GET /api/session → Retourne la session courante (ou vide)
 * - POST /api/session → Enregistre une nouvelle session
 * - DELETE /api/session → Efface la session
 */
public class SessionServer {

  private static final int PORT = 9090;
  private static final ObjectMapper objectMapper = new ObjectMapper();
  private static HttpServer server;

  /**
   * Démarre le serveur de synchronisation de session local
   */
  public static void start() {
    try {
      server = HttpServer.create(new InetSocketAddress("0.0.0.0", PORT), 10);

      // Route: GET /api/session
      server.createContext("/api/session", exchange -> {
        if ("GET".equals(exchange.getRequestMethod())) {
          handleGetSession(exchange);
        } else if ("POST".equals(exchange.getRequestMethod())) {
          handlePostSession(exchange);
        } else if ("DELETE".equals(exchange.getRequestMethod())) {
          handleDeleteSession(exchange);
        } else if ("OPTIONS".equals(exchange.getRequestMethod())) {
          handleCORS(exchange);
        } else {
          sendResponse(exchange, 405, "Method not allowed");
        }
      });

      server.setExecutor(java.util.concurrent.Executors.newFixedThreadPool(2));
      server.start();

      System.out.println("✅ Session server started on http://localhost:" + PORT);
      System.out.println("   Web app can now sync sessions via /api/session");
    } catch (IOException e) {
      System.err.println("❌ Failed to start session server: " + e.getMessage());
    }
  }

  /**
   * Arrête le serveur
   */
  public static void stop() {
    if (server != null) {
      server.stop(0);
      System.out.println("✅ Session server stopped");
    }
  }

  private static void handleGetSession(HttpExchange exchange) throws IOException {
    AuthSession session = SessionManager.getCurrentSession();
    
    if (session != null) {
      String json = objectMapper.writeValueAsString(session);
      sendResponse(exchange, 200, json);
      System.out.println("📤 Session served to web app");
    } else {
      sendResponse(exchange, 204, ""); // No content
    }
  }

  private static void handlePostSession(HttpExchange exchange) throws IOException {
    try {
      InputStream body = exchange.getRequestBody();
      byte[] bytes = body.readAllBytes();
      String json = new String(bytes, StandardCharsets.UTF_8);

      AuthSession session = objectMapper.readValue(json, AuthSession.class);
      SessionManager.saveSession(session);

      Map<String, String> response = new HashMap<>();
      response.put("status", "ok");
      response.put("message", "Session saved");

      String responseJson = objectMapper.writeValueAsString(response);
      sendResponse(exchange, 200, responseJson);
      System.out.println("📥 Session received from web app");
    } catch (Exception e) {
      Map<String, String> error = new HashMap<>();
      error.put("error", e.getMessage());
      String errorJson = objectMapper.writeValueAsString(error);
      sendResponse(exchange, 400, errorJson);
    }
  }

  private static void handleDeleteSession(HttpExchange exchange) throws IOException {
    SessionManager.clearSession();

    Map<String, String> response = new HashMap<>();
    response.put("status", "ok");
    response.put("message", "Session cleared");

    String responseJson = objectMapper.writeValueAsString(response);
    sendResponse(exchange, 200, responseJson);
    System.out.println("🗑️  Session cleared from web app");
  }

  private static void handleCORS(HttpExchange exchange) throws IOException {
    exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
    exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
    exchange.sendResponseHeaders(204, 0);
    exchange.close();
  }

  private static void sendResponse(HttpExchange exchange, int statusCode, String responseBody)
      throws IOException {
    // CORS headers
    exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
    exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
    exchange.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");

    byte[] response = responseBody.getBytes(StandardCharsets.UTF_8);
    exchange.sendResponseHeaders(statusCode, response.length);

    try (OutputStream os = exchange.getResponseBody()) {
      os.write(response);
    }

    exchange.close();
  }
}
