package fr.quartierconnect.desktopapp;

import fr.quartierconnect.desktopapp.util.TrustAllCertificatesManager;
import fr.quartierconnect.desktopapp.view.ViewManager;
import javafx.application.Application;
import javafx.stage.Stage;

public class QuartierConnectApp extends Application {

  @Override
  public void start(Stage stage) {
    TrustAllCertificatesManager.getHttpClient();

    // SSO: The app will listen for sessions synced from the web admin portal
    // via POST http://localhost:9090/api/session (SessionServer)
    
    ViewManager.getInstance().init(stage);
    ViewManager.getInstance().showLoginOrDashboard();
    stage.show();
  }
}
