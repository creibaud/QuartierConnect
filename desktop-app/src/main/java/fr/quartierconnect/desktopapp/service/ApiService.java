package fr.quartierconnect.desktopapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import fr.quartierconnect.desktopapp.model.AuthSession;
import fr.quartierconnect.desktopapp.util.TrustAllCertificatesManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

public class ApiService {

  private static final String API_BASE = System.getProperty("api.url", "https://api.localhost/v1");
  private static final Duration TIMEOUT = Duration.ofSeconds(10);

  private static ApiService instance;

  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private String accessToken;

  private ApiService() {
    // Utiliser le HttpClient personnalisé qui accepte les certificats auto-signés
    this.httpClient = TrustAllCertificatesManager.getHttpClient();
    this.objectMapper = new ObjectMapper();
  }

  public static ApiService getInstance() {
    if (instance == null) {
      instance = new ApiService();
    }
    return instance;
  }

  public CompletableFuture<AuthSession> ssoLogin(String email, String password, String totpCode) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            Map<String, Object> body =
                totpCode != null && !totpCode.isBlank()
                    ? Map.of("email", email, "password", password, "totpCode", totpCode)
                    : Map.of("email", email, "password", password);

            String json = objectMapper.writeValueAsString(body);
            HttpRequest request =
                HttpRequest.newBuilder()
                    .uri(URI.create(API_BASE + "/auth/sso/token"))
                    .timeout(TIMEOUT)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
              String message = extractErrorMessage(response.body());
              throw new RuntimeException(message);
            }

            AuthSession session = objectMapper.readValue(response.body(), AuthSession.class);
            this.accessToken = session.getAccessToken();
            
            // Sauvegarder la session pour partage SSO
            SessionManager.saveSession(session);
            
            return session;
          } catch (RuntimeException e) {
            throw e;
          } catch (java.net.ConnectException e) {
            String apiUrl = API_BASE.replace("/v1", "");
            throw new RuntimeException(
                "Cannot connect to API server at " + apiUrl + ".\n"
                    + "Make sure the backend is running (npm run start:dev in api/ directory).\n"
                    + "And Caddy is running (via docker-compose up -d).\n"
                    + "Current API endpoint: " + API_BASE,
                e);
          } catch (java.net.http.HttpTimeoutException e) {
            throw new RuntimeException(
                "Connection timeout. The API server at " + API_BASE + " is not responding.\n"
                    + "Please ensure the backend is running and accessible.",
                e);
          } catch (Exception e) {
            String cause = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            throw new RuntimeException("Connection failed: " + cause, e);
          }
        });
  }

  public String getAccessToken() {
    return accessToken;
  }

  public void clearSession() {
    this.accessToken = null;
    SessionManager.clearSession();
  }

  /**
   * Charge une session sauvegardée (SSO)
   * Retourne la session si trouvée et valide, sinon null
   */
  public AuthSession loadSavedSession() {
    AuthSession session = SessionManager.loadSession();
    if (session != null) {
      this.accessToken = session.getAccessToken();
      System.out.println("✅ Using saved session for SSO");
    }
    return session;
  }

  private String extractErrorMessage(String body) {
    try {
      Map<?, ?> parsed = objectMapper.readValue(body, Map.class);
      Object msg = parsed.get("message");
      if (msg instanceof String s) return s;
      return "Authentication failed";
    } catch (Exception e) {
      return "Authentication failed";
    }
  }
}
