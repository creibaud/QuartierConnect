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
import javafx.scene.effect.ColorAdjust;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;
import org.kordamp.ikonli.fontawesome5.FontAwesomeSolid;
import org.kordamp.ikonli.javafx.FontIcon;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.function.Consumer;
import java.util.logging.Logger;

public class LoginView {

    private static final Logger log = Logger.getLogger(LoginView.class.getName());

    private final Stage stage;
    private final Consumer<String> openBrowser;
    private final StackPane root;

    private final Label  errorLabel    = new Label();
    private final Button ssoButton     = new Button("Se connecter via le navigateur");
    private final Button offlineButton = new Button();

    public LoginView(Stage stage, Consumer<String> openBrowser) {
        this.stage       = stage;
        this.openBrowser = openBrowser;
        this.root        = buildLayout();
        checkStartupSession();
    }

    public Parent getRoot() {
        return root;
    }

    // ── Layout ───────────────────────────────────────────────────────────────

    private StackPane buildLayout() {
        // Logo
        ImageView logoImg = new ImageView();
        try {
            Image img = new Image(Objects.requireNonNull(
                getClass().getResourceAsStream("/images/logo.png")));
            logoImg.setImage(img);
        } catch (Exception ignored) {}
        logoImg.setFitWidth(52);
        logoImg.setFitHeight(52);
        logoImg.setPreserveRatio(true);
        logoImg.setSmooth(true);
        ColorAdjust whiten = new ColorAdjust();
        whiten.setBrightness(1.0);
        logoImg.setEffect(whiten);

        // App name
        Label appName = new Label("QuartierConnect");
        appName.getStyleClass().add("login-app-name");

        // Tagline
        Label tagline = new Label("Connectez-vous via votre navigateur\npour accéder à l'administration.");
        tagline.getStyleClass().add("login-tagline");
        tagline.setTextAlignment(javafx.scene.text.TextAlignment.CENTER);

        // SSO button
        FontIcon ssoIcon = new FontIcon(FontAwesomeSolid.SIGN_IN_ALT);
        ssoIcon.setIconSize(13);
        ssoButton.setGraphic(ssoIcon);
        ssoButton.setGraphicTextGap(8);
        ssoButton.getStyleClass().add("login-btn-primary");
        ssoButton.setMaxWidth(Double.MAX_VALUE);
        ssoButton.setOnAction(e -> startSsoPkceFlow());

        // Error label
        errorLabel.getStyleClass().add("login-error");
        errorLabel.setWrapText(true);
        errorLabel.setTextAlignment(javafx.scene.text.TextAlignment.CENTER);
        errorLabel.setVisible(false);
        errorLabel.setManaged(false);

        // Offline button
        offlineButton.getStyleClass().add("login-btn-ghost");
        offlineButton.setMaxWidth(Double.MAX_VALUE);
        offlineButton.setVisible(false);
        offlineButton.setManaged(false);
        offlineButton.setOnAction(e -> continueOffline());

        // Footer
        Label footer = new Label("Connexion sécurisée · SSO + TOTP");
        footer.getStyleClass().add("login-footer");

        // Card
        VBox card = new VBox(logoImg, appName, tagline, ssoButton, errorLabel, offlineButton, footer);
        card.setAlignment(Pos.CENTER);
        card.getStyleClass().add("login-card");
        card.setMaxWidth(360);
        card.setMaxHeight(javafx.scene.layout.Region.USE_PREF_SIZE);
        VBox.setMargin(appName,       new Insets(20, 0, 6,  0));
        VBox.setMargin(tagline,       new Insets(0,  0, 28, 0));
        VBox.setMargin(errorLabel,    new Insets(14, 0, 0,  0));
        VBox.setMargin(offlineButton, new Insets(8,  0, 0,  0));
        VBox.setMargin(footer,        new Insets(24, 0, 0,  0));

        StackPane bg = new StackPane(card);
        bg.getStyleClass().add("login-bg");
        return bg;
    }

    // ── Business logic (unchanged) ───────────────────────────────────────────

    private void checkStartupSession() {
        new Thread(() -> {
            boolean hasSession = AuthService.getInstance().tryResumeFromDatabase();
            if (!hasSession) {
                boolean apiUp = ApiService.isReachable();
                if (!apiUp) {
                    Platform.runLater(() ->
                        showError("Serveur inaccessible. Vérifiez que l'API est démarrée."));
                }
                return;
            }

            Platform.runLater(() -> setSsoLoading(true, "Connexion automatique…"));

            boolean apiUp = ApiService.isReachable();
            if (apiUp) {
                boolean tokenValid = AuthService.getInstance().getAccessToken() != null
                        && !AuthService.getInstance().isTokenExpired(AuthService.getInstance().getAccessToken());

                if (tokenValid) {
                    Platform.runLater(this::navigateToMain);
                    return;
                }

                boolean refreshed = AuthService.getInstance().refreshAccessToken();
                if (refreshed) {
                    Platform.runLater(this::navigateToMain);
                } else {
                    Platform.runLater(() -> {
                        setSsoLoading(false, null);
                        showOfflineOption("Session expirée. Reconnectez-vous via le navigateur ou continuez hors ligne.");
                    });
                }
            } else {
                Platform.runLater(() -> {
                    setSsoLoading(false, null);
                    showOfflineOption("Serveur inaccessible. Vous pouvez continuer hors ligne avec votre dernière session.");
                });
            }
        }, "startup-session-check").start();
    }

    private void startSsoPkceFlow() {
        setSsoLoading(true);

        new Thread(() -> {
            if (!ApiService.isReachable()) {
                Platform.runLater(() -> {
                    showError("Serveur inaccessible. Vérifiez que l'API est démarrée (localhost:5000).");
                    setSsoLoading(false);
                });
                return;
            }

            String state = UUID.randomUUID().toString();
            CompletableFuture<String> future = new CompletableFuture<>();

            SsoCallbackServer server;
            try {
                server = SsoCallbackServer.startCallbackServer(state, future);
            } catch (Exception e) {
                log.severe("Cannot start SSO callback server: " + e.getMessage());
                Platform.runLater(() -> {
                    showError("Impossible de démarrer le serveur SSO local.");
                    setSsoLoading(false);
                });
                return;
            }

            int    port         = server.getPort();
            String callbackUrl  = "http://localhost:" + port + "/cb";
            String authorizeUrl = "http://localhost:3001/sso/authorize"
                    + "?state="    + URLEncoder.encode(state,       StandardCharsets.UTF_8)
                    + "&redirect=" + URLEncoder.encode(callbackUrl, StandardCharsets.UTF_8);

            Platform.runLater(() -> openBrowser.accept(authorizeUrl));

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
        }, "sso-pkce-flow").start();
    }

    private void continueOffline() {
        navigateToMain();
    }

    private void showOfflineOption(String message) {
        showError(message);
        String email = AuthService.getInstance().getCurrentUserEmail();
        offlineButton.setText(email != null
            ? "Continuer hors ligne (" + email + ")"
            : "Continuer hors ligne");
        offlineButton.setVisible(true);
        offlineButton.setManaged(true);
    }

    private void navigateToMain() {
        MainView mainView = new MainView(stage, openBrowser);
        stage.getScene().setRoot(mainView.getRoot());
        stage.setResizable(true);
        stage.setMinWidth(860);
        stage.setMinHeight(560);
        stage.setWidth(1100);
        stage.setHeight(720);
    }

    private void showError(String message) {
        errorLabel.setText(message);
        errorLabel.setVisible(true);
        errorLabel.setManaged(true);
    }

    private void setSsoLoading(boolean loading) {
        setSsoLoading(loading, null);
    }

    private void setSsoLoading(boolean loading, String customText) {
        ssoButton.setDisable(loading);
        if (customText != null) {
            ssoButton.setText(customText);
        } else {
            ssoButton.setText(loading
                ? "En attente du navigateur…"
                : "Se connecter via le navigateur");
        }
    }
}
