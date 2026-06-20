package fr.quartierconnect.desktopapp.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

@Timeout(10)
class SsoCallbackServerTest {

    private static final HttpClient HTTP = HttpClient.newHttpClient();

    private HttpResponse<String> get(int port, String path) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + path))
                .GET()
                .build();
        return HTTP.send(req, HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void validCallback_completesFutureWithToken() throws Exception {
        String state = UUID.randomUUID().toString();
        String expectedToken = UUID.randomUUID().toString();
        CompletableFuture<String> future = new CompletableFuture<>();

        SsoCallbackServer server = SsoCallbackServer.startCallbackServer(state, future);
        int port = server.getPort();

        HttpResponse<String> response = get(port, "/cb?token=" + expectedToken + "&state=" + state);

        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("Login successful"));
        assertEquals(expectedToken, future.get(2, TimeUnit.SECONDS));
        server.stop();
    }

    @Test
    void stateMismatch_completesExceptionallyWithSecurityException() throws Exception {
        String expectedState = UUID.randomUUID().toString();
        String wrongState = UUID.randomUUID().toString();
        CompletableFuture<String> future = new CompletableFuture<>();

        SsoCallbackServer server = SsoCallbackServer.startCallbackServer(expectedState, future);
        int port = server.getPort();

        HttpResponse<String> response = get(port, "/cb?token=some-token&state=" + wrongState);

        assertEquals(400, response.statusCode());
        ExecutionException ex = assertThrows(ExecutionException.class,
                () -> future.get(2, TimeUnit.SECONDS));
        assertInstanceOf(SecurityException.class, ex.getCause());
        server.stop();
    }

    @Test
    void accessDenied_completesExceptionally() throws Exception {
        String state = UUID.randomUUID().toString();
        CompletableFuture<String> future = new CompletableFuture<>();

        SsoCallbackServer server = SsoCallbackServer.startCallbackServer(state, future);
        int port = server.getPort();

        get(port, "/cb?error=access_denied&state=" + state);

        ExecutionException ex = assertThrows(ExecutionException.class,
                () -> future.get(2, TimeUnit.SECONDS));
        assertInstanceOf(IllegalStateException.class, ex.getCause());
        server.stop();
    }

    @Test
    void missingToken_completesExceptionally() throws Exception {
        String state = UUID.randomUUID().toString();
        CompletableFuture<String> future = new CompletableFuture<>();

        SsoCallbackServer server = SsoCallbackServer.startCallbackServer(state, future);
        int port = server.getPort();

        get(port, "/cb?state=" + state);

        ExecutionException ex = assertThrows(ExecutionException.class,
                () -> future.get(2, TimeUnit.SECONDS));
        assertInstanceOf(IllegalArgumentException.class, ex.getCause());
        server.stop();
    }

    @Test
    void waitForSsoCallback_stopsServerAfterSuccess() throws Exception {
        String state = UUID.randomUUID().toString();
        String token = UUID.randomUUID().toString();
        CompletableFuture<String> future = new CompletableFuture<>();

        SsoCallbackServer server = SsoCallbackServer.startCallbackServer(state, future);
        int port = server.getPort();

        get(port, "/cb?token=" + token + "&state=" + state);

        String result = SsoCallbackServer.waitForSsoCallback(server, future);
        assertEquals(token, result);

        assertThrows(Exception.class, () -> get(port, "/cb?token=x&state=" + state),
                "Server should be stopped after waitForSsoCallback returns");
    }

    @Test
    void portBindingIsAtomic_noRaceCondition() throws Exception {
        String state = UUID.randomUUID().toString();
        CompletableFuture<String> future = new CompletableFuture<>();

        SsoCallbackServer server = SsoCallbackServer.startCallbackServer(state, future);
        int port = server.getPort();

        assertTrue(port > 0, "OS should assign a valid port");
        assertTrue(port <= 65535);

        HttpResponse<String> probe = get(port, "/cb?token=t&state=" + state);
        assertEquals(200, probe.statusCode(), "Server should be immediately reachable after startCallbackServer");
        server.stop();
    }

    @Test
    void emptyProbeConnection_ignoredGracefully() throws Exception {
        String state = UUID.randomUUID().toString();
        CompletableFuture<String> future = new CompletableFuture<>();

        SsoCallbackServer server = SsoCallbackServer.startCallbackServer(state, future);
        int port = server.getPort();

        // Simulate browser probe: open a plain TCP connection and immediately close it
        try (java.net.Socket probe = new java.net.Socket("localhost", port)) {
            // Send nothing — just connect and close
        }

        // Server must still be alive and handle the real callback
        String expectedToken = UUID.randomUUID().toString();
        HttpResponse<String> response = get(port, "/cb?token=" + expectedToken + "&state=" + state);
        assertEquals(200, response.statusCode());
        assertEquals(expectedToken, future.get(2, TimeUnit.SECONDS));
        server.stop();
    }
}
