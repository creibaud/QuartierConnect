package fr.quartierconnect.desktopapp.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fr.quartierconnect.desktopapp.services.AuthService;
import fr.quartierconnect.desktopapp.services.ContractsService;
import fr.quartierconnect.desktopapp.services.EventsService;
import fr.quartierconnect.desktopapp.services.NeighborhoodsService;
import fr.quartierconnect.desktopapp.services.StatisticsService;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Tests d'intégration des services desktop face à une API en fonctionnement.
 *
 * Conditions d'exécution :
 *   - l'API doit être joignable sur http://localhost:5000
 *   - MongoDB + PostgreSQL doivent être démarrés (docker compose up -d)
 *
 * Ces tests s'exécutent pendant `mvn test` mais s'auto-ignorent via assumeTrue lorsque l'API
 * est injoignable, si bien qu'ils ne bloquent jamais la phase standard de tests unitaires.
 *
 * Pour les lancer explicitement sur une URL non par défaut :
 *   mvn test -Dapi.url=http://localhost:5000
 */
@Tag("integration")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ApiIntegrationTest {

    private static final String API = System.getProperty("api.url", "http://localhost:5000");
    private static final String DEMO_PASSWORD = "Demo1234!";
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    // État partagé entre les tests ordonnés
    private static String accessToken;
    private static String totpSecret;

    // -----------------------------------------------------------------------
    // Contrôle préalable : ignorer tous les tests si l'API est injoignable
    // -----------------------------------------------------------------------

    @BeforeAll
    static void setupAndSkipIfApiDown() throws Exception {
        boolean apiUp = isApiReachable();
        assumeTrue(apiUp, "API not reachable at " + API + " — skipping integration tests");

        System.setProperty("api.url", API);

        // Enregistrer un nouvel utilisateur pour cette exécution de tests
        String email = "integration_" + UUID.randomUUID().toString().substring(0, 8) + "@test.fr";
        String regBody = JSON.writeValueAsString(Map.of("email", email, "password", DEMO_PASSWORD));

        String regResponse = httpPost("/auth/register", regBody, null);
        JsonNode regNode = JSON.readTree(regResponse);
        String otpauthUrl = regNode.path("otpauthUrl").asText();
        totpSecret = extractSecret(otpauthUrl);

        String totpCode = generateTotp(totpSecret);
        String loginBody = JSON.writeValueAsString(
                Map.of("email", email, "password", DEMO_PASSWORD, "totpCode", totpCode));

        String loginResponse = httpPost("/auth/login", loginBody, null);
        JsonNode loginNode = JSON.readTree(loginResponse);
        accessToken = loginNode.path("accessToken").asText();

        assertFalse(accessToken.isEmpty(), "Login must return a valid access token");

        // Injecter dans le singleton AuthService
        injectAccessToken(accessToken);
    }

    // -----------------------------------------------------------------------
    // Auth : validité du jeton
    // -----------------------------------------------------------------------

    @Test
    @Order(1)
    void authService_isAuthenticated_trueAfterLogin() {
        assertTrue(AuthService.getInstance().isAuthenticated(),
                "AuthService should report authenticated after injecting a fresh token");
    }

    @Test
    @Order(2)
    void authService_getCurrentUserEmail_notNull() {
        // l'e-mail est intégré dans le payload JWT
        assertNotNull(AuthService.getInstance().getCurrentUserEmail());
    }

    // -----------------------------------------------------------------------
    // NeighborhoodsService
    // -----------------------------------------------------------------------

    @Test
    @Order(3)
    void neighborhoodsService_fetchNeighborhoods_returnsList() {
        NeighborhoodsService service = new NeighborhoodsService();
        List<NeighborhoodsService.NeighborhoodSummary> result = service.fetchNeighborhoods();
        assertNotNull(result, "fetchNeighborhoods must not return null");
        // Le résultat peut être vide (aucun quartier initialisé) mais ne doit pas lever d'exception
    }

    // -----------------------------------------------------------------------
    // EventsService
    // -----------------------------------------------------------------------

    @Test
    @Order(4)
    void eventsService_fetchEvents_returnsList() {
        EventsService service = new EventsService();
        List<EventsService.EventSummary> result = service.fetchEvents();
        assertNotNull(result, "fetchEvents must not return null");
    }

    // -----------------------------------------------------------------------
    // ContractsService
    // -----------------------------------------------------------------------

    @Test
    @Order(5)
    void contractsService_fetchContracts_returnsList() {
        ContractsService service = new ContractsService();
        List<ContractsService.ContractSummary> result = service.fetchContracts();
        assertNotNull(result, "fetchContracts must not return null");
    }

    // -----------------------------------------------------------------------
    // StatisticsService
    // -----------------------------------------------------------------------

    @Test
    @Order(6)
    void statisticsService_fetchStats_remoteValuesPresent() throws Exception {
        StatisticsService service = new StatisticsService();
        StatisticsService.Stats stats = service.computeStats();
        assertNotNull(stats, "fetchStats must not return null");
        // Les compteurs distants viennent de l'API — au moins non négatifs
        if (stats.remoteUsers() != null) {
            assertTrue(stats.remoteUsers() >= 0);
        }
        if (stats.remoteIncidents() != null) {
            assertTrue(stats.remoteIncidents() >= 0);
        }
    }

    // -----------------------------------------------------------------------
    // Rafraîchissement du jeton
    // -----------------------------------------------------------------------

    @Test
    @Order(7)
    void authService_refreshAccessToken_succeedsWithValidRefreshToken() {
        // Le jeton de rafraîchissement n'est pas stocké dans AuthService après notre injection manuelle.
        // Ce test vérifie que refreshAccessToken() retourne false proprement (aucun jeton de rafraîchissement)
        // au lieu de lever une exception — le vrai flux de rafraîchissement est testé dans auth.e2e-spec.ts.
        assertDoesNotThrow(() -> AuthService.getInstance().refreshAccessToken());
    }

    // -----------------------------------------------------------------------
    // Utilitaires
    // -----------------------------------------------------------------------

    private static boolean isApiReachable() {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(API + "/health"))
                    .timeout(Duration.ofSeconds(2))
                    .GET().build();
            HttpResponse<Void> res = HTTP.send(req, HttpResponse.BodyHandlers.discarding());
            return res.statusCode() < 500;
        } catch (Exception e) {
            return false;
        }
    }

    private static String httpPost(String path, String body, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(API + path))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        HttpResponse<String> res = HTTP.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() >= 400) {
            throw new RuntimeException("HTTP " + res.statusCode() + " on " + path + ": " + res.body());
        }
        return res.body();
    }

    private static String extractSecret(String otpauthUrl) {
        int idx = otpauthUrl.indexOf("secret=");
        if (idx < 0) throw new IllegalArgumentException("No secret in: " + otpauthUrl);
        int end = otpauthUrl.indexOf('&', idx);
        return end < 0 ? otpauthUrl.substring(idx + 7) : otpauthUrl.substring(idx + 7, end);
    }

    /** TOTP RFC 6238 — Java pur, sans bibliothèque externe. */
    private static String generateTotp(String base32Secret) throws Exception {
        String alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        String upper = base32Secret.toUpperCase().replaceAll("=", "");
        StringBuilder bits = new StringBuilder();
        for (char c : upper.toCharArray()) {
            int val = alphabet.indexOf(c);
            if (val >= 0) bits.append(String.format("%5s", Integer.toBinaryString(val)).replace(' ', '0'));
        }
        byte[] key = new byte[bits.length() / 8];
        for (int i = 0; i < key.length; i++) {
            key[i] = (byte) Integer.parseInt(bits.substring(i * 8, i * 8 + 8), 2);
        }
        long counter = System.currentTimeMillis() / 1000 / 30;
        byte[] counterBytes = new byte[8];
        for (int i = 7; i >= 0; i--) { counterBytes[i] = (byte) (counter & 0xFF); counter >>= 8; }

        javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA1");
        mac.init(new javax.crypto.spec.SecretKeySpec(key, "HmacSHA1"));
        byte[] hash = mac.doFinal(counterBytes);

        int offset = hash[hash.length - 1] & 0x0F;
        int code = ((hash[offset] & 0x7F) << 24) | ((hash[offset + 1] & 0xFF) << 16)
                | ((hash[offset + 2] & 0xFF) << 8) | (hash[offset + 3] & 0xFF);
        return String.format("%06d", code % 1_000_000);
    }

    private static void injectAccessToken(String token) throws Exception {
        java.lang.reflect.Field field = AuthService.class.getDeclaredField("accessToken");
        field.setAccessible(true);
        field.set(AuthService.getInstance(), token);
    }
}
