package fr.quartierconnect.desktopapp.views;

import fr.quartierconnect.desktopapp.services.ApiService;
import fr.quartierconnect.desktopapp.services.AuthService;
import fr.quartierconnect.desktopapp.services.SsoCallbackServer;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Parent;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.function.Consumer;
import java.util.logging.Logger;

public class LoginView {

    private static final Logger log = Logger.getLogger(LoginView.class.getName());

    private final Stage stage;
    private final Consumer<String> openBrowser;
    private final VBox root;

    private final Label errorLabel = new Label();
    private final Button ssoButton = new Button("Se connecter via le navigateur");
    private final Button offlineButton = new Button("Continuer hors ligne");

    public LoginView(Stage stage, Consumer<String> openBrowser) {
        this.stage = stage;
        this.openBrowser = openBrowser;
        this.root = buildLayout();
        checkStartupSession();
    }

    public Parent getRoot() {
        return root;
    }

    // ------------------------------------------------------------------
    // Layout
    // ------------------------------------------------------------------

    private VBox buildLayout() {
        Label title = new Label("QuartierConnect");
        title.getStyleClass().add("title");

        Label description = new Label("Cliquez sur le bouton ci-dessous pour vous authentifier\nvia votre navigateur web.");
        description.getStyleClass().add("subtitle");
        description.setWrapText(true);
        description.setTextAlignment(javafx.scene.text.TextAlignment.CENTER);

        errorLabel.getStyleClass().add("error-label");
        errorLabel.setWrapText(true);
        errorLabel.setVisible(false);

        ssoButton.getStyleClass().add("primary-button");
        ssoButton.setMaxWidth(Double.MAX_VALUE);
        ssoButton.setOnAction(e -> startSsoPkceFlow());

        offlineButton.getStyleClass().add("secondary-button");
        offlineButton.setMaxWidth(Double.MAX_VALUE);
        offlineButton.setVisible(false);
        offlineButton.setManaged(false);
        offlineButton.setOnAction(e -> continueOffline());

        VBox layout = new VBox(16, title, description, errorLabel, ssoButton, offlineButton);
        layout.setAlignment(Pos.CENTER);
        layout.setPadding(new Insets(40, 40, 40, 40));
        layout.getStyleClass().add("login-box");

        return layout;
    }

    // ------------------------------------------------------------------
    // Startup: check for a cached session
    // ------------------------------------------------------------------

    /**
     * Called once on construction, in a background thread.
     * Scenario A — session in SQLite + network reachable → refresh token → go to main
     * Scenario B — session in SQLite + network unreachable → show offline button
     * Scenario C — no session → show normal SSO button (no change)
     */
    private void checkStartupSession() {
        new Thread(() -> {
            boolean hasSession = AuthService.getInstance().tryResumeFromDatabase();
            if (!hasSession) return; // Scenario C — nothing to do

            boolean online = ApiService.isReachable();
            if (online) {
                boolean refreshed = AuthService.getInstance().refreshAccessToken();
                if (refreshed) {
                    Platform.runLater(this::navigateToMain);
                } else {
                    // Refresh failed even though network seemed up — show offline button as fallback
                    Platform.runLater(() -> showOfflineOption("Session expirée. Reconnecter via le navigateur ou continuer hors ligne."));
                }
            } else {
                Platform.runLater(() -> showOfflineOption("Réseau non disponible. Vous pouvez continuer hors ligne avec votre dernière session."));
            }
        }, "startup-session-check").start();
    }

    // ------------------------------------------------------------------
    // Online: SSO PKCE flow
    // ------------------------------------------------------------------

    private void startSsoPkceFlow() {
        String state = UUID.randomUUID().toString();
        CompletableFuture<String> future = new CompletableFuture<>();

        SsoCallbackServer server;
        try {
            server = SsoCallbackServer.startCallbackServer(state, future);
        } catch (Exception e) {
            log.severe("Cannot start SSO callback server: " + e.getMessage());
            showError("Impossible de démarrer le serveur SSO local.");
            return;
        }

        int port = server.getPort();
        String callbackUrl = "http://localhost:" + port + "/cb";
        String authorizeUrl = "http://localhost:3000/sso/authorize"
                + "?state=" + URLEncoder.encode(state, StandardCharsets.UTF_8)
                + "&redirect=" + URLEncoder.encode(callbackUrl, StandardCharsets.UTF_8);

        Platform.runLater(() -> {
            setSsoLoading(true);
            openBrowser.accept(authorizeUrl);
        });

        new Thread(() -> {
            try {
                String token = SsoCallbackServer.waitForSsoCallback(server, future);
                AuthService.getInstance().exchangeSsoToken(token, state);
                Platform.runLater(this::navigateToMain);
            } catch (Exception e) {
                log.warning("SSO PKCE flow failed: " + e.getMessage());
                Platform.runLater(() -> {
                    showError("Connexion SSO annulée ou expirée.");
                    setSsoLoading(false);
                });
            }
        }).start();
    }

    // ------------------------------------------------------------------
    // Offline: continue with cached session
    // ------------------------------------------------------------------

    private void continueOffline() {
        navigateToMain();
    }

    private void showOfflineOption(String message) {
        showError(message);
        offlineButton.setVisible(true);
        offlineButton.setManaged(true);
        String email = AuthService.getInstance().getCurrentUserEmail();
        if (email != null) {
            offlineButton.setText("Continuer hors ligne (" + email + ")");
        }
    }

    // ------------------------------------------------------------------
    // Navigation + helpers
    // ------------------------------------------------------------------

    private void navigateToMain() {
        MainView mainView = new MainView(stage, openBrowser);
        stage.getScene().setRoot(mainView.getRoot());
        stage.setWidth(800);
        stage.setHeight(600);
        stage.setResizable(true);
    }

    private void showError(String message) {
        errorLabel.setText(message);
        errorLabel.setVisible(true);
    }

    private void setSsoLoading(boolean loading) {
        ssoButton.setDisable(loading);
        ssoButton.setText(loading ? "En attente du navigateur…" : "Se connecter via le navigateur");
    }
}
