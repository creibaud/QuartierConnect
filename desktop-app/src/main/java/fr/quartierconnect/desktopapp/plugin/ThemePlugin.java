package fr.quartierconnect.desktopapp.plugin;

import atlantafx.base.theme.PrimerDark;
import atlantafx.base.theme.PrimerLight;
import fr.quartierconnect.desktopapp.i18n.I18n;
import javafx.application.Application;
import javafx.beans.property.ReadOnlyBooleanProperty;
import javafx.beans.property.ReadOnlyBooleanWrapper;
import javafx.collections.ObservableList;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.control.ToggleButton;
import javafx.scene.control.ToggleGroup;
import javafx.scene.layout.FlowPane;
import javafx.scene.layout.VBox;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.prefs.Preferences;

/**
 * Built-in plugin toggling between the default "Voisinage" theme and Primer Dark.
 * The choice is persisted via {@link Preferences}.
 */
public class ThemePlugin implements QuartierConnectPlugin, PluginRegistry.ContextAwarePlugin, ViewablePlugin {

    public static final String THEME_VOISINAGE = "voisinage";
    public static final String THEME_DARK = "primer-dark";
    static final String DEFAULT_THEME_ID = THEME_VOISINAGE;

    private static final String PREF_THEME_KEY = "themeId";
    private static final List<String> KNOWN_THEME_IDS = List.of(THEME_VOISINAGE, THEME_DARK);

    private static final String VOISINAGE_ACCENT = "#000091";
    private static final String DARK_ACCENT = "#444c56";

    /** Overrides layered on top of Primer Dark, targeting the current shell selectors. */
    private static final String DARK_OVERRIDE_CSS =
        ".app-sidebar{-fx-background-color:derive(-color-bg-default,-18%);}" +
        ".app-topbar{-fx-background-color:derive(-color-bg-default,-18%);}" +
        ".sidebar-nav-item:hover{-fx-background-color:rgba(255,255,255,0.06);}" +
        ".incidents-table .column-header-background{-fx-background-color:rgba(255,255,255,0.04);}";

    private static final ReadOnlyBooleanWrapper DARK_THEME_ACTIVE = new ReadOnlyBooleanWrapper(false);

    private static volatile String activeThemeId = DEFAULT_THEME_ID;

    private AppContext context;

    @Override public String getId()      { return "fr.quartierconnect.plugin.theme"; }
    @Override public String getName()    { return I18n.get("plugin.theme.name"); }
    @Override public String getVersion() { return "1.2.0"; }
    @Override public String getDescription() { return I18n.get("plugin.theme.description"); }
    @Override public void setContext(AppContext ctx) { this.context = ctx; }

    @Override public void onLoad()   { applyTheme(loadPersistedThemeId(), false); }
    @Override public void onUnload() { applyTheme(DEFAULT_THEME_ID, false); }

    /** True while a dark base theme is active (views adapt things like the logo). */
    public static ReadOnlyBooleanProperty darkThemeActiveProperty() {
        return DARK_THEME_ACTIVE.getReadOnlyProperty();
    }

    /** Applies the persisted theme (or the default) to the given scene at startup. */
    public static void applyPersistedTheme(Scene scene) {
        applyThemeToScene(loadPersistedThemeId(), scene);
    }

    static String loadPersistedThemeId() {
        return sanitizeThemeId(preferences().get(PREF_THEME_KEY, DEFAULT_THEME_ID));
    }

    /** Maps unknown or legacy persisted ids (e.g. "nord-dark") back to the default theme. */
    static String sanitizeThemeId(String storedThemeId) {
        return storedThemeId != null && KNOWN_THEME_IDS.contains(storedThemeId)
                ? storedThemeId
                : DEFAULT_THEME_ID;
    }

    @Override
    public Node getPanel() {
        Label chooseLbl = sectionLabel(I18n.get("plugin.theme.choose"));

        ToggleGroup group = new ToggleGroup();
        ToggleButton voisinageBtn = themeBtn(I18n.get("plugin.theme.voisinage"), THEME_VOISINAGE, group, VOISINAGE_ACCENT);
        ToggleButton darkBtn      = themeBtn(I18n.get("plugin.theme.dark"),      THEME_DARK,      group, DARK_ACCENT);

        selectCurrent(group, voisinageBtn, darkBtn);

        group.selectedToggleProperty().addListener((obs, old, next) -> {
            if (next instanceof ToggleButton tb) applyTheme((String) tb.getUserData(), true);
        });

        Label persistNote = new Label(I18n.get("plugin.theme.persistNote"));
        persistNote.setWrapText(true);
        persistNote.setStyle("-fx-font-size: 10.5px; -fx-text-fill: -color-fg-subtle;");

        return new VBox(8, chooseLbl, flowRow(voisinageBtn, darkBtn), persistNote);
    }

    private void selectCurrent(ToggleGroup group, ToggleButton... buttons) {
        for (ToggleButton b : buttons) {
            if (activeThemeId.equals(b.getUserData())) {
                b.setSelected(true);
                return;
            }
        }
        buttons[0].setSelected(true);
    }

    private Label sectionLabel(String text) {
        Label lbl = new Label(text);
        lbl.setStyle("-fx-font-size: 10px; -fx-font-weight: bold; -fx-text-fill: -color-fg-subtle;");
        return lbl;
    }

    private ToggleButton themeBtn(String label, String id, ToggleGroup group, String accent) {
        ToggleButton btn = new ToggleButton(label);
        btn.setToggleGroup(group);
        btn.setUserData(id);
        applyThemeBtnStyle(btn, accent, false);
        btn.selectedProperty().addListener((obs, old, sel) -> applyThemeBtnStyle(btn, accent, sel));
        return btn;
    }

    private void applyThemeBtnStyle(ToggleButton btn, String accent, boolean selected) {
        if (selected) {
            btn.setStyle("-fx-background-radius: 4; -fx-border-radius: 4;-fx-padding: 5 12; "
                    + "-fx-font-size: 11.5px; -fx-cursor: hand; "
                    + "-fx-border-width: 1; -fx-border-color: " + accent + "; "
                    + "-fx-background-color: " + accent + "; "
                    + "-fx-text-fill: white; -fx-font-weight: bold;");
        } else {
            btn.setStyle("-fx-background-radius: 4; -fx-border-radius: 4;-fx-padding: 5 12; "
                    + "-fx-font-size: 11.5px; -fx-cursor: hand; "
                    + "-fx-background-color: transparent; "
                    + "-fx-border-width: 1; -fx-border-color: " + accent + "; "
                    + "-fx-text-fill: -color-fg-default;");
        }
    }

    private FlowPane flowRow(ToggleButton... btns) {
        FlowPane row = new FlowPane(6, 6);
        row.setAlignment(Pos.CENTER_LEFT);
        row.getChildren().addAll(btns);
        return row;
    }

    private void applyTheme(String themeId, boolean persist) {
        Scene scene = context != null ? context.getScene() : null;
        applyThemeToScene(themeId, scene);
        if (persist) {
            preferences().put(PREF_THEME_KEY, themeId);
        }
    }

    private static void applyThemeToScene(String themeId, Scene scene) {
        String validThemeId = sanitizeThemeId(themeId);
        boolean isDark = THEME_DARK.equals(validThemeId);

        Application.setUserAgentStylesheet(isDark
                ? new PrimerDark().getUserAgentStylesheet()
                : new PrimerLight().getUserAgentStylesheet());
        activeThemeId = validThemeId;
        DARK_THEME_ACTIVE.set(isDark);

        if (scene == null) return;
        String appCss = ThemePlugin.class.getResource("/styles/app.css").toExternalForm();
        String voisinageCss = ThemePlugin.class.getResource("/styles/voisinage.css").toExternalForm();
        String darkCss = cssDataUri(DARK_OVERRIDE_CSS);

        ObservableList<String> sheets = scene.getStylesheets();
        sheets.removeAll(appCss, voisinageCss, darkCss);
        sheets.add(0, appCss);
        sheets.add(1, isDark ? darkCss : voisinageCss);
    }

    private static String cssDataUri(String css) {
        return "data:text/css;charset=utf-8,"
                + URLEncoder.encode(css, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private static Preferences preferences() {
        return Preferences.userNodeForPackage(ThemePlugin.class);
    }
}
