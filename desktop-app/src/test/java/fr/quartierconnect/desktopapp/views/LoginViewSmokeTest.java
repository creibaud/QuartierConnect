package fr.quartierconnect.desktopapp.views;

import fr.quartierconnect.desktopapp.database.SQLiteDatabase;
import fr.quartierconnect.desktopapp.services.ApiService;
import fr.quartierconnect.desktopapp.services.AuthService;
import fr.quartierconnect.desktopapp.services.TokenVault;
import fr.quartierconnect.desktopapp.i18n.I18n;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.stage.Stage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.testfx.api.FxRobot;
import org.testfx.api.FxToolkit;
import org.testfx.util.WaitForAsyncUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Smoke tests for the JavaFX login screen. They drive the real toolkit under a
 * virtual display (Xvfb in CI) and stay fully offline — ApiService.isReachable
 * returns false instantly in offline mode — so no network, browser, or SSO
 * callback is ever involved. Interactions fire on the FX thread rather than
 * moving a robot mouse, which keeps them deterministic.
 */
class LoginViewSmokeTest {

    private final FxRobot robot = new FxRobot();
    private Stage stage;

    @BeforeAll
    static void bootToolkit() throws Exception {
        FxToolkit.registerPrimaryStage();
    }

    @BeforeEach
    void seedCleanOfflineState() throws Exception {
        Path tmp = Files.createTempFile("qc-login-smoke", ".db");
        tmp.toFile().deleteOnExit();
        System.setProperty("sqlite.url", "jdbc:sqlite:" + tmp.toAbsolutePath());
        SQLiteDatabase.initialize();
        ApiService.setOfflineMode(true);
        AuthService.getInstance().clearSession();
    }

    @AfterEach
    void resetGlobalState() {
        ApiService.setOfflineMode(false);
        AuthService.getInstance().clearSession();
    }

    private void showLogin() throws Exception {
        FxToolkit.setupStage(s -> {
            stage = s;
            LoginView view = new LoginView(s, url -> { /* never opened offline */ });
            s.setScene(new Scene(view.getRoot(), 420, 560));
            s.show();
        });
        WaitForAsyncUtils.waitForFxEvents();
    }

    private static String buildJwt(String email, long expEpochSeconds) {
        String header = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes());
        String payload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(("{\"sub\":\"user-1\",\"email\":\"" + email
                        + "\",\"exp\":" + expEpochSeconds + "}").getBytes());
        return header + "." + payload + ".fakesig";
    }

    @Test
    void loginScreenRendersTheSsoButton() throws Exception {
        showLogin();

        Button sso = robot.lookup(".login-btn-primary").queryButton();
        assertNotNull(sso, "the SSO button must be rendered");
        assertTrue(sso.isVisible());
    }

    @Test
    void ssoClickShowsServerUnreachableWhenApiIsDown() throws Exception {
        showLogin();
        Label error = robot.lookup(".login-error").queryAs(Label.class);
        String expected = I18n.get("login.error.serverUnreachablePort");

        WaitForAsyncUtils.asyncFx(
                () -> robot.lookup(".login-btn-primary").queryButton().fire());

        WaitForAsyncUtils.waitFor(5, TimeUnit.SECONDS,
                () -> expected.equals(error.getText()) && error.isVisible());
        assertEquals(expected, error.getText());
    }

    @Test
    void continuingOfflineNavigatesToMainView() throws Exception {
        // A resumable session with an expired access token + an API that is
        // down (offline mode) is what makes the login offer the offline button.
        SQLiteDatabase.saveSession("demo@quartier.fr");
        TokenVault.getInstance().saveTokens(
                buildJwt("demo@quartier.fr",
                        (System.currentTimeMillis() / 1000L) - 3600),
                "refresh.token");

        showLogin();

        // The startup thread flips the offline button visible asynchronously.
        WaitForAsyncUtils.waitFor(5, TimeUnit.SECONDS,
                () -> robot.lookup(".login-btn-ghost").tryQuery()
                        .map(node -> node.isVisible()).orElse(false));

        WaitForAsyncUtils.asyncFx(
                () -> robot.lookup(".login-btn-ghost").queryButton().fire());

        // Reaching MainView swaps the scene root: the sidebar appears and the
        // login button is gone.
        WaitForAsyncUtils.waitFor(5, TimeUnit.SECONDS,
                () -> robot.lookup(".app-sidebar").tryQuery().isPresent()
                        && robot.lookup(".login-btn-primary").tryQuery().isEmpty());
        assertTrue(robot.lookup(".app-sidebar").tryQuery().isPresent(),
                "continuing offline must land on the main view");
    }
}
