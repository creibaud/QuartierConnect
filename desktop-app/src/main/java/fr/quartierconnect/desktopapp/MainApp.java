package fr.quartierconnect.desktopapp;

import fr.quartierconnect.desktopapp.database.SQLiteDatabase;
import fr.quartierconnect.desktopapp.plugin.ThemePlugin;
import fr.quartierconnect.desktopapp.services.UpdateService;
import fr.quartierconnect.desktopapp.views.LoginView;
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.text.Font;
import javafx.stage.Stage;

import java.io.InputStream;
import java.util.logging.Logger;

public class MainApp extends Application {

    private static final Logger LOG = Logger.getLogger(MainApp.class.getName());

    private final UpdateService updateService = new UpdateService();

    @Override
    public void start(Stage primaryStage) throws Exception {
        loadBrandFonts();
        SQLiteDatabase.initialize();

        LoginView loginView = new LoginView(primaryStage, url -> getHostServices().showDocument(url));
        Scene scene = new Scene(loginView.getRoot(), 420, 560);
        ThemePlugin.applyPersistedTheme(scene);

        primaryStage.setTitle("QuartierConnect");
        primaryStage.setScene(scene);
        primaryStage.setResizable(false);
        primaryStage.show();

        startBackgroundUpdateChecks();
    }

    @Override
    public void stop() {
        updateService.shutdown();
    }

    private void loadBrandFonts() {
        loadFont("/fonts/Fraunces-Regular.ttf");
        loadFont("/fonts/Fraunces-SemiBold.ttf");
    }

    private void loadFont(String resourcePath) {
        try (InputStream fontStream = getClass().getResourceAsStream(resourcePath)) {
            if (fontStream == null || Font.loadFont(fontStream, 12) == null) {
                LOG.warning("Brand font unavailable, system serif will be used: " + resourcePath);
            }
        } catch (Exception e) {
            LOG.warning("Brand font failed to load (" + resourcePath + "): " + e.getMessage());
        }
    }

    private void startBackgroundUpdateChecks() {
        updateService.setOnUpdateAvailable(version ->
                LOG.info("A newer version is available: v" + version));
        updateService.checkInBackground();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
