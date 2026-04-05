package fr.quartierconnect.desktopapp.view;

import fr.quartierconnect.desktopapp.model.AuthSession;
import fr.quartierconnect.desktopapp.service.ApiService;
import java.io.IOException;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.stage.Stage;

public class ViewManager {

  private static ViewManager instance;
  private Stage stage;

  private ViewManager() {}

  public static ViewManager getInstance() {
    if (instance == null) {
      instance = new ViewManager();
    }
    return instance;
  }

  public void init(Stage stage) {
    this.stage = stage;
    stage.setTitle("QuartierConnect");
    stage.setMinWidth(1100);
    stage.setMinHeight(680);
  }

  /**
   * Affiche le login ou directement le dashboard si une session SSO est trouvée
   */
  public void showLoginOrDashboard() {
    // Essayer de restaurer une session sauvegardée
    AuthSession savedSession = ApiService.getInstance().loadSavedSession();
    if (savedSession != null) {
      showDashboard(savedSession);
    } else {
      showLogin();
    }
  }

  public void showLogin() {
    try {
      FXMLLoader loader =
          new FXMLLoader(getClass().getResource("/fr/quartierconnect/desktopapp/login.fxml"));
      Parent root = loader.load();
      Scene scene = new Scene(root, 480, 620);
      scene
          .getStylesheets()
          .add(
              getClass()
                  .getResource("/fr/quartierconnect/desktopapp/styles/theme.css")
                  .toExternalForm());
      stage.setResizable(false);
      stage.setScene(scene);
    } catch (IOException e) {
      throw new RuntimeException("Failed to load login view", e);
    }
  }

  public void showDashboard(AuthSession session) {
    try {
      FXMLLoader loader =
          new FXMLLoader(getClass().getResource("/fr/quartierconnect/desktopapp/dashboard.fxml"));
      Parent root = loader.load();

      fr.quartierconnect.desktopapp.controller.DashboardController controller =
          loader.getController();
      controller.initSession(session);

      Scene scene = new Scene(root, 1200, 760);
      scene
          .getStylesheets()
          .add(
              getClass()
                  .getResource("/fr/quartierconnect/desktopapp/styles/theme.css")
                  .toExternalForm());
      stage.setResizable(true);
      stage.setScene(scene);
    } catch (IOException e) {
      throw new RuntimeException("Failed to load dashboard view", e);
    }
  }
}
