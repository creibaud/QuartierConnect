package fr.quartierconnect.desktopapp.plugin;

import atlantafx.base.theme.CupertinoDark;
import atlantafx.base.theme.CupertinoLight;
import atlantafx.base.theme.Dracula;
import atlantafx.base.theme.NordDark;
import atlantafx.base.theme.NordLight;
import atlantafx.base.theme.PrimerDark;
import atlantafx.base.theme.PrimerLight;
import javafx.application.Application;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.control.Label;
import javafx.scene.control.ToggleButton;
import javafx.scene.control.ToggleGroup;
import javafx.scene.layout.FlowPane;
import javafx.scene.layout.VBox;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Built-in plugin — switches the AtlantaFX base theme.
 * Dark themes inject a sidebar CSS override so the sidebar stays readable.
 */
public class ThemePlugin implements QuartierConnectPlugin, PluginRegistry.ContextAwarePlugin, ViewablePlugin {

    private AppContext context;
    private String activeThemeId = "primer-dark";

    private static final String DARK_SIDEBAR_CSS =
        ".root{-qc-sidebar-bg:#1c1c1e;-qc-sidebar-bg2:#2c2c2e;-qc-sidebar-bg3:#3a3a3c;-qc-statusbar-bg:#141416;}" +
        ".sidebar{-fx-border-color:rgba(255,255,255,0.07) transparent transparent transparent;}" +
        ".sidebar-header{-fx-border-color:transparent transparent rgba(255,255,255,0.07) transparent;}" +
        ".sidebar-app-name{-fx-text-fill:rgba(255,255,255,0.9);}" +
        ".sidebar-version{-fx-text-fill:rgba(255,255,255,0.35);}" +
        ".sidebar-section-label{-fx-text-fill:rgba(255,255,255,0.22);}" +
        ".menu-button{-fx-text-fill:rgba(255,255,255,0.6);}" +
        ".menu-button:hover{-fx-background-color:-qc-sidebar-bg2;-fx-text-fill:rgba(255,255,255,0.88);}" +
        ".menu-button-active{-fx-text-fill:white;}" +
        ".menu-icon{-fx-icon-color:rgba(255,255,255,0.4);}" +
        ".logout-button{-fx-text-fill:rgba(255,255,255,0.4);}" +
        ".logout-button:hover{-fx-text-fill:#f87171;-fx-background-color:rgba(239,68,68,0.12);}" +
        ".sidebar-sync-stat-lbl{-fx-text-fill:rgba(255,255,255,0.28);}" +
        ".sidebar-sep-line{-fx-background-color:rgba(255,255,255,0.07);}" +
        ".sidebar-nav-badge-amber{-fx-background-color:rgba(180,83,9,0.3);-fx-text-fill:#fbbf24;}" +
        ".sidebar-nav-badge-red{-fx-background-color:rgba(220,38,38,0.3);-fx-text-fill:#f87171;}" +
        ".sidebar-nav-badge-muted{-fx-background-color:rgba(255,255,255,0.08);-fx-text-fill:rgba(255,255,255,0.35);}" +
        ".statusbar{-fx-border-color:rgba(255,255,255,0.06) transparent transparent transparent;}" +
        ".statusbar-stat{-fx-text-fill:rgba(255,255,255,0.3);}" +
        ".statusbar-stat-ok{-fx-text-fill:rgba(34,197,94,0.6);}" +
        ".statusbar-stat-warn{-fx-text-fill:rgba(251,191,36,0.6);}" +
        ".statusbar-center{-fx-text-fill:rgba(255,255,255,0.18);}" +
        ".statusbar-sep{-fx-background-color:rgba(255,255,255,0.1);}";

    private static final String LIGHT_SIDEBAR_CSS =
        ".root{-qc-sidebar-bg:#f8f9fb;-qc-sidebar-bg2:#f0f2f5;-qc-sidebar-bg3:#e8f0fe;-qc-statusbar-bg:#f8f9fb;}" +
        ".sidebar{-fx-border-color:transparent -color-border-default transparent transparent;}" +
        ".sidebar-header{-fx-border-color:transparent transparent -color-border-default transparent;}" +
        ".sidebar-app-name{-fx-text-fill:#18181b;}" +
        ".sidebar-version{-fx-text-fill:#71717a;}" +
        ".sidebar-section-label{-fx-text-fill:#a1a1aa;}" +
        ".menu-button{-fx-text-fill:#52525b;}" +
        ".menu-button:hover{-fx-background-color:-qc-sidebar-bg2;-fx-text-fill:#18181b;}" +
        ".menu-button-active{-fx-text-fill:#1d4ed8;}" +
        ".menu-icon{-fx-icon-color:#a1a1aa;}" +
        ".logout-button{-fx-text-fill:#71717a;}" +
        ".logout-button:hover{-fx-text-fill:#dc2626;-fx-background-color:#fee2e2;}" +
        ".sidebar-sync-stat-lbl{-fx-text-fill:#a1a1aa;}" +
        ".sidebar-sep-line{-fx-background-color:-color-border-default;}" +
        ".sidebar-nav-badge-amber{-fx-background-color:#fef3c7;-fx-text-fill:#b45309;}" +
        ".sidebar-nav-badge-red{-fx-background-color:#fee2e2;-fx-text-fill:#dc2626;}" +
        ".sidebar-nav-badge-muted{-fx-background-color:#f1f5f9;-fx-text-fill:#64748b;}" +
        ".statusbar{-fx-border-color:-color-border-default transparent transparent transparent;}" +
        ".statusbar-stat{-fx-text-fill:#71717a;}" +
        ".statusbar-stat-ok{-fx-text-fill:#15803d;}" +
        ".statusbar-stat-warn{-fx-text-fill:#b45309;}" +
        ".statusbar-center{-fx-text-fill:#a1a1aa;}" +
        ".statusbar-sep{-fx-background-color:-color-border-default;}";

    @Override public String getId()      { return "fr.quartierconnect.plugin.theme"; }
    @Override public String getName()    { return "Gestionnaire de thème"; }
    @Override public String getVersion() { return "1.1.0"; }
    @Override public String getDescription() { return "Permet de changer le thème visuel de l'application (clair, sombre, Dracula, Nord)."; }
    @Override public void setContext(AppContext ctx) { this.context = ctx; }
    @Override public void onLoad()   { applyTheme(activeThemeId); }
    @Override public void onUnload() { applyTheme("nord-dark"); }

    @Override
    public Node getPanel() {
        Label lightLbl = sectionLabel("Thèmes clairs");
        Label darkLbl  = sectionLabel("Thèmes sombres");

        ToggleGroup group = new ToggleGroup();

        ToggleButton primerBtn    = themeBtn("Primer Light",    "primer-light",    group, "#2563eb");
        ToggleButton cupertinoBtn = themeBtn("Cupertino",       "cupertino-light", group, "#059669");
        ToggleButton nordBtn      = themeBtn("Nord Light",      "nord-light",      group, "#0891b2");
        ToggleButton primerDBtn   = themeBtn("Primer Dark",     "primer-dark",     group, "#6366f1");
        ToggleButton cupertinoDBtn= themeBtn("Cupertino Dark",  "cupertino-dark",  group, "#8b5cf6");
        ToggleButton draculaBtn   = themeBtn("Dracula",         "dracula",         group, "#bd93f9");
        ToggleButton nordDBtn     = themeBtn("Nord Dark",       "nord-dark",       group, "#38bdf8");

        selectCurrent(group, primerBtn, cupertinoBtn, nordBtn, primerDBtn, cupertinoDBtn, draculaBtn, nordDBtn);

        group.selectedToggleProperty().addListener((obs, old, next) -> {
            if (next instanceof ToggleButton tb) applyTheme((String) tb.getUserData());
        });

        FlowPane lightRow = flowRow(primerBtn, cupertinoBtn, nordBtn);
        FlowPane darkRow  = flowRow(primerDBtn, cupertinoDBtn, draculaBtn, nordDBtn);

        VBox panel = new VBox(8, lightLbl, lightRow, darkLbl, darkRow);
        return panel;
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
            btn.setStyle("-fx-background-radius: 6; -fx-border-radius: 6; -fx-padding: 5 12; "
                    + "-fx-font-size: 11.5px; -fx-cursor: hand; "
                    + "-fx-border-width: 1; -fx-border-color: " + accent + "; "
                    + "-fx-background-color: " + accent + "; "
                    + "-fx-text-fill: white; -fx-font-weight: bold;");
        } else {
            btn.setStyle("-fx-background-radius: 6; -fx-border-radius: 6; -fx-padding: 5 12; "
                    + "-fx-font-size: 11.5px; -fx-cursor: hand; "
                    + "-fx-border-width: 1; -fx-border-color: " + accent + "; "
                    + "-fx-text-fill: " + accent + ";");
        }
    }

    private FlowPane flowRow(ToggleButton... btns) {
        FlowPane row = new FlowPane(6, 6);
        row.setAlignment(Pos.CENTER_LEFT);
        row.getChildren().addAll(btns);
        return row;
    }

    private void applyTheme(String themeId) {
        activeThemeId = themeId;
        boolean isDark = themeId.contains("dark") || themeId.equals("dracula");

        String stylesheet = switch (themeId) {
            case "cupertino-light" -> new CupertinoLight().getUserAgentStylesheet();
            case "cupertino-dark"  -> new CupertinoDark().getUserAgentStylesheet();
            case "primer-dark"     -> new PrimerDark().getUserAgentStylesheet();
            case "dracula"         -> new Dracula().getUserAgentStylesheet();
            case "nord-light"      -> new NordLight().getUserAgentStylesheet();
            case "nord-dark"       -> new NordDark().getUserAgentStylesheet();
            default                -> new PrimerLight().getUserAgentStylesheet();
        };

        Application.setUserAgentStylesheet(stylesheet);

        if (context != null && context.getScene() != null) {
            javafx.collections.ObservableList<String> sheets = context.getScene().getStylesheets();
            sheets.clear();
            String appCss = getClass().getResource("/styles/app.css").toExternalForm();
            sheets.add(appCss);

            String overrideCss = isDark ? DARK_SIDEBAR_CSS : LIGHT_SIDEBAR_CSS;
            try {
                String dataUri = "data:text/css;charset=utf-8,"
                        + URLEncoder.encode(overrideCss, StandardCharsets.UTF_8).replace("+", "%20");
                sheets.add(dataUri);
            } catch (Exception ignored) {}
        }
    }
}
