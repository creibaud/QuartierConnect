package fr.quartierconnect.desktopapp.controller;

import fr.quartierconnect.desktopapp.model.AuthSession;
import fr.quartierconnect.desktopapp.service.ApiService;
import fr.quartierconnect.desktopapp.service.SessionManager;
import fr.quartierconnect.desktopapp.ui.BrandLogo;
import fr.quartierconnect.desktopapp.view.ViewManager;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.ProgressIndicator;
import javafx.scene.control.TextField;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import java.awt.Desktop;
import java.net.URI;
import java.util.Timer;
import java.util.TimerTask;

public class LoginController {

  @FXML private TextField emailField;
  @FXML private PasswordField passwordField;
  @FXML private TextField totpField;
  @FXML private VBox totpSection;
  @FXML private Button loginButton;
  @FXML private Button ssoButton;
  @FXML private Label errorLabel;
  @FXML private ProgressIndicator spinner;
  @FXML private HBox loginBrandLogoContainer;

  private boolean isWaitingForSSO = false;
  private Timer ssoPollingTimer;

  @FXML
  public void initialize() {
    totpSection.setVisible(false);
    totpSection.setManaged(false);
    errorLabel.setVisible(false);
    errorLabel.setManaged(false);
    spinner.setVisible(false);
    spinner.setManaged(false);

    if (loginBrandLogoContainer != null) {
      BrandLogo logo = new BrandLogo(28);
      loginBrandLogoContainer.getChildren().set(0, logo);
    }
  }

  @FXML
  public void onLogin() {
    String email = emailField.getText().trim();
    String password = passwordField.getText();
    String totp = totpField.getText().trim();

    if (email.isEmpty() || password.isEmpty()) {
      showError("Email and password are required");
      return;
    }

    setLoading(true);

    ApiService.getInstance()
        .ssoLogin(email, password, totp.isEmpty() ? null : totp)
        .thenAccept(
            session ->
                Platform.runLater(
                    () -> {
                      setLoading(false);
                      ViewManager.getInstance().showDashboard(session);
                    }))
        .exceptionally(
            ex -> {
              Platform.runLater(
                  () -> {
                    setLoading(false);
                    String msg =
                        ex.getCause() != null ? ex.getCause().getMessage() : ex.getMessage();
                    if (msg != null && msg.contains("TOTP")) {
                      showTotpField();
                    } else {
                      showError(msg != null ? msg : "Authentication failed");
                    }
                  });
              return null;
            });
  }

  /**
   * Opens the web admin login page in the default browser.
   * After login, the web app will automatically sync the session to the desktop app
   * via POST http://localhost:9090/api/session
   */
  @FXML
  public void onSSO() {
    try {
      String loginUrl = "https://admin.localhost/fr/login";
      Desktop.getDesktop().browse(new URI(loginUrl));
      System.out.println("📱 Opening admin login in browser: " + loginUrl);
      System.out.println("   After login, your session will automatically sync to this app.");
      
      // Start polling for SSO session
      startSSOPolling();
    } catch (Exception e) {
      System.err.println("❌ Failed to open login page: " + e.getMessage());
      showError("Failed to open login page in browser");
    }
  }

  /**
   * Polls for a session synced from the web app.
   * Checks every 2 seconds for up to 5 minutes.
   */
  private void startSSOPolling() {
    if (isWaitingForSSO) {
      return; // Already polling
    }

    isWaitingForSSO = true;
    loginButton.setDisable(true);
    ssoButton.setDisable(true);
    showError("Waiting for web login... (max 5 min)");
    spinner.setVisible(true);
    spinner.setManaged(true);

    ssoPollingTimer = new Timer();
    final long[] elapsedMs = {0};
    final long maxWaitMs = 5 * 60 * 1000; // 5 minutes

    ssoPollingTimer.scheduleAtFixedRate(
        new TimerTask() {
          @Override
          public void run() {
            elapsedMs[0] += 2000;

            // Check if a new session was synced from web
            AuthSession session = SessionManager.getCurrentSession();
            if (session != null && session.getAccessToken() != null) {
              Platform.runLater(
                  () -> {
                    stopSSOPolling();
                    System.out.println("✅ SSO session detected!");
                    ViewManager.getInstance().showDashboard(session);
                  });
              return;
            }

            // Timeout after 5 minutes
            if (elapsedMs[0] >= maxWaitMs) {
              Platform.runLater(
                  () -> {
                    stopSSOPolling();
                    showError("SSO timeout. Please try again.");
                    loginButton.setDisable(false);
                    ssoButton.setDisable(false);
                  });
            }
          }
        },
        2000, // Delay 2s before first check
        2000); // Repeat every 2s
  }

  private void stopSSOPolling() {
    isWaitingForSSO = false;
    if (ssoPollingTimer != null) {
      ssoPollingTimer.cancel();
      ssoPollingTimer = null;
    }
    spinner.setVisible(false);
    spinner.setManaged(false);
    loginButton.setDisable(false);
    ssoButton.setDisable(false);
  }

  private void showTotpField() {
    totpSection.setVisible(true);
    totpSection.setManaged(true);
    totpField.requestFocus();
    showError("Two-factor authentication required");
  }

  private void showError(String message) {
    errorLabel.setText(message);
    errorLabel.setVisible(true);
    errorLabel.setManaged(true);
  }

  private void setLoading(boolean loading) {
    loginButton.setDisable(loading);
    spinner.setVisible(loading);
    spinner.setManaged(loading);
    errorLabel.setVisible(false);
    errorLabel.setManaged(false);
  }
}
