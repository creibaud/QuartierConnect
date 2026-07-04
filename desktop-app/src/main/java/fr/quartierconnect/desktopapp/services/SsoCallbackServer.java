package fr.quartierconnect.desktopapp.services;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;

public class SsoCallbackServer {

    private static final Logger log = Logger.getLogger(SsoCallbackServer.class.getName());

    private static final String CALLBACK_PATH = "/cb";

    private static final String SUCCESS_HTML = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <title>QuartierConnect</title>
              <style>
                body { font-family: system-ui, sans-serif; text-align: center;
                       padding: 3rem; background: #f4f4f5; color: #18181b; }
                h2 { color: #16a34a; }
              </style>
            </head>
            <body>
              <h2>Login successful</h2>
              <p>You can close this window and return to the application.</p>
            </body>
            </html>
            """;

    private static final String ERROR_HTML = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <title>QuartierConnect</title>
              <style>
                body { font-family: system-ui, sans-serif; text-align: center;
                       padding: 3rem; background: #f4f4f5; color: #18181b; }
                h2 { color: #dc2626; }
              </style>
            </head>
            <body>
              <h2>Authentication error</h2>
              <p>Login failed. Restart the flow from the application.</p>
            </body>
            </html>
            """;

    private final ServerSocket serverSocket;

    private SsoCallbackServer(ServerSocket serverSocket) {
        this.serverSocket = serverSocket;
    }

    public int getPort() {
        return serverSocket.getLocalPort();
    }

    public void stop() {
        try {
            serverSocket.close();
        } catch (IOException ignored) {
        }
        log.fine("SSO callback server stopped");
    }

    /**
     * Démarre un ServerSocket simple sur un port attribué par l'OS et accepte les connexions
     * dans un thread démon. Ignore silencieusement les connexions de sondage vides (par exemple la
     * pré-connexion de Chrome) et continue d'accepter jusqu'à ce que le future soit résolu.
     *
     * @param expectedState l'état UUID généré par le client avant l'ouverture du navigateur
     * @param future        résolu avec le jeton SSO en cas de succès, échoué en cas d'erreur
     * @return le SsoCallbackServer en cours d'exécution (l'appelant doit appeler stop() après usage)
     */
    public static SsoCallbackServer startCallbackServer(
            String expectedState,
            CompletableFuture<String> future) throws IOException {

        ServerSocket serverSocket = new ServerSocket(0, 0, InetAddress.getLoopbackAddress());
        SsoCallbackServer callbackServer = new SsoCallbackServer(serverSocket);

        Thread thread = new Thread(() -> {
            log.fine("SSO callback server started on port " + serverSocket.getLocalPort());
            while (!serverSocket.isClosed() && !future.isDone()) {
                try {
                    Socket socket = serverSocket.accept();
                    socket.setSoTimeout(5_000);
                    handleConnection(socket, expectedState, future);
                } catch (SocketException e) {
                    if (!serverSocket.isClosed()) {
                        log.warning("SSO server accept error: " + e.getMessage());
                    }
                } catch (IOException e) {
                    log.fine("SSO accept loop IO error: " + e.getMessage());
                }
            }
        }, "sso-callback-server");
        thread.setDaemon(true);
        thread.start();

        return callbackServer;
    }

    /**
     * Bloque jusqu'à la réception du callback SSO ou l'écoulement de 5 minutes.
     * Arrête toujours le serveur, même en cas de délai dépassé ou d'exception.
     *
     * @param server le serveur de callback en cours d'exécution
     * @param future le future résolu par le gestionnaire de callback
     * @return le jeton SSO
     */
    public static String waitForSsoCallback(
            SsoCallbackServer server,
            CompletableFuture<String> future) throws Exception {
        try {
            return future.get(5, TimeUnit.MINUTES);
        } finally {
            server.stop();
        }
    }

    private static void handleConnection(
            Socket socket,
            String expectedState,
            CompletableFuture<String> future) {

        try (socket) {
            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));

            String requestLine = reader.readLine();
            if (requestLine == null || requestLine.isBlank()) {
                return; // Sondage du navigateur — connexion vide, à ignorer silencieusement
            }

            String[] parts = requestLine.split(" ");
            if (parts.length < 2 || !"GET".equals(parts[0])) {
                sendResponse(socket.getOutputStream(), 405, "Method Not Allowed", ERROR_HTML);
                return;
            }

            String pathAndQuery = parts[1];
            int qmark = pathAndQuery.indexOf('?');
            String path = qmark >= 0 ? pathAndQuery.substring(0, qmark) : pathAndQuery;
            String query = qmark >= 0 ? pathAndQuery.substring(qmark + 1) : "";

            if (!CALLBACK_PATH.equals(path)) {
                log.fine("SSO callback rejected unexpected path: " + path);
                sendResponse(socket.getOutputStream(), 404, "Not Found", ERROR_HTML);
                return;
            }

            String errorParam = parseQueryParam(query, "error");
            if (errorParam != null) {
                log.warning("SSO flow rejected by user: " + errorParam);
                sendResponse(socket.getOutputStream(), 200, "OK", ERROR_HTML);
                future.completeExceptionally(new IllegalStateException("SSO flow cancelled by user"));
                return;
            }

            String token = parseQueryParam(query, "token");
            String receivedState = parseQueryParam(query, "state");

            if (token == null || receivedState == null) {
                log.warning("SSO callback missing required parameters (token or state)");
                sendResponse(socket.getOutputStream(), 400, "Bad Request", ERROR_HTML);
                future.completeExceptionally(
                        new IllegalArgumentException("Missing token or state in callback"));
                return;
            }

            if (!expectedState.equals(receivedState)) {
                log.severe("SSO state mismatch — possible CSRF. Expected: "
                        + expectedState + ", got: " + receivedState);
                sendResponse(socket.getOutputStream(), 400, "Bad Request", ERROR_HTML);
                future.completeExceptionally(new SecurityException("SSO state mismatch"));
                return;
            }

            sendResponse(socket.getOutputStream(), 200, "OK", SUCCESS_HTML);
            future.complete(token);

        } catch (IOException e) {
            log.fine("SSO connection read error (likely browser probe): " + e.getMessage());
        }
    }

    private static String parseQueryParam(String query, String key) {
        if (query == null || query.isEmpty()) return null;
        for (String pair : query.split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2 && kv[0].equals(key)) {
                return URLDecoder.decode(kv[1], StandardCharsets.UTF_8);
            }
        }
        return null;
    }

    private static void sendResponse(OutputStream out, int status, String statusText, String html)
            throws IOException {
        byte[] bytes = html.getBytes(StandardCharsets.UTF_8);
        String headers = "HTTP/1.1 " + status + " " + statusText + "\r\n"
                + "Content-Type: text/html; charset=UTF-8\r\n"
                + "Content-Length: " + bytes.length + "\r\n"
                + "Connection: close\r\n"
                + "\r\n";
        out.write(headers.getBytes(StandardCharsets.UTF_8));
        out.write(bytes);
        out.flush();
    }
}
