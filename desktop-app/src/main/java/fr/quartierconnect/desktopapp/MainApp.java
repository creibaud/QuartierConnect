package fr.quartierconnect.desktopapp;

import fr.quartierconnect.desktopapp.database.SQLiteDatabase;
import fr.quartierconnect.desktopapp.i18n.I18n;
import fr.quartierconnect.desktopapp.plugin.ThemePlugin;
import fr.quartierconnect.desktopapp.services.UpdateService;
import fr.quartierconnect.desktopapp.ui.components.ToastManager;
import fr.quartierconnect.desktopapp.views.LoginView;
import javafx.animation.PauseTransition;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.scene.Scene;
import javafx.scene.layout.StackPane;
import javafx.stage.Stage;
import javafx.util.Duration;

import java.util.logging.Logger;

public class MainApp extends Application {

    private static final Logger LOG = Logger.getLogger(MainApp.class.getName());

    private final UpdateService updateService = new UpdateService();

    private Stage primaryStage;

    @Override
    public void start(Stage primaryStage) throws Exception {
        this.primaryStage = primaryStage;
        SQLiteDatabase.initialize();

        LoginView loginView = new LoginView(primaryStage, url -> getHostServices().showDocument(url));
        Scene scene = new Scene(loginView.getRoot(), 420, 560);
        ThemePlugin.applyPersistedTheme(scene);

        primaryStage.setTitle("QuartierConnect");
        primaryStage.setScene(scene);
        primaryStage.setResizable(false);
        primaryStage.show();

        startBackgroundUpdateChecks();
        exitAfterRenderWhenSmokeTesting();
    }

    /** CI hook: confirm the UI boots on the target OS, then exit cleanly. */
    private void exitAfterRenderWhenSmokeTesting() {
        if (!"1".equals(System.getenv("QC_SMOKE_TEST"))) return;
        LOG.info("SMOKE_TEST_OK");
        PauseTransition delay = new PauseTransition(Duration.seconds(2));
        delay.setOnFinished(event -> {
            Platform.exit();
            System.exit(0);
        });
        delay.play();
    }

    @Override
    public void stop() {
        updateService.shutdown();
    }

    private void startBackgroundUpdateChecks() {
        updateService.setOnUpdateAvailable(this::announceUpdateAvailable);
        updateService.checkInBackground();
    }

    private void announceUpdateAvailable(String version) {
        LOG.info("A newer version is available: v" + version);
        Platform.runLater(() -> showUpdateToast(version));
    }

    private void showUpdateToast(String version) {
        if (primaryStage == null || primaryStage.getScene() == null
                || !(primaryStage.getScene().getRoot() instanceof StackPane root)) {
            return;
        }
        new ToastManager(root).showInfo(I18n.get("update.toast.available", version));
    }

    public static void main(String[] args) {
        launch(args);
    }
}
