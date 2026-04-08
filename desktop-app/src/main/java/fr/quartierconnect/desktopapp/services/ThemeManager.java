package fr.quartierconnect.desktopapp.services;

import javafx.scene.Scene;

import java.util.Objects;
import java.util.prefs.Preferences;

/**
 * Manages application themes (light / dark) using JavaFX CSS stylesheets.
 * The selected theme is persisted across restarts via java.util.prefs.
 */
public class ThemeManager {

    public enum Theme {
        LIGHT("light"),
        DARK("dark"),
        HIGH_CONTRAST("high-contrast");

        private final String key;

        Theme(String key) {
            this.key = key;
        }

        public String getKey() {
            return key;
        }

        public static Theme fromKey(String key) {
            for (Theme t : values()) {
                if (t.key.equals(key)) return t;
            }
            return LIGHT;
        }
    }

    private static final String PREF_KEY = "theme";
    private static final Preferences PREFS =
            Preferences.userNodeForPackage(ThemeManager.class);

    private static ThemeManager instance;

    private Theme currentTheme;
    private Scene scene;

    private ThemeManager() {
        this.currentTheme = Theme.fromKey(PREFS.get(PREF_KEY, Theme.LIGHT.getKey()));
    }

    public static synchronized ThemeManager getInstance() {
        if (instance == null) {
            instance = new ThemeManager();
        }
        return instance;
    }

    public void bindScene(Scene scene) {
        this.scene = scene;
        applyTheme(currentTheme);
    }

    public void setTheme(Theme theme) {
        this.currentTheme = theme;
        PREFS.put(PREF_KEY, theme.getKey());
        if (scene != null) {
            applyTheme(theme);
        }
    }

    public Theme getCurrentTheme() {
        return currentTheme;
    }

    public void toggleTheme() {
        Theme[] themes = Theme.values();
        int next = (currentTheme.ordinal() + 1) % themes.length;
        setTheme(themes[next]);
    }

    private void applyTheme(Theme theme) {
        scene.getStylesheets().clear();
        String cssPath = "/fr/quartierconnect/desktopapp/themes/" + theme.getKey() + ".css";
        try {
            String url = Objects.requireNonNull(
                    ThemeManager.class.getResource(cssPath),
                    "CSS not found: " + cssPath
            ).toExternalForm();
            scene.getStylesheets().add(url);
        } catch (NullPointerException e) {
            // CSS file missing — run with no custom theme (graceful degradation)
        }
    }
}
