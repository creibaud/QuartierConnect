package fr.quartierconnect.desktopapp.plugin;

import fr.quartierconnect.desktopapp.i18n.I18n;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.control.Label;
import javafx.scene.control.ToggleButton;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Built-in plugin — injects a compact-mode CSS override that reduces
 * padding and font sizes for higher information density.
 */
public class CompactModePlugin implements QuartierConnectPlugin, PluginRegistry.ContextAwarePlugin, ViewablePlugin {

    private AppContext context;
    private boolean compactActive = false;

    private static final String COMPACT_CSS =
        ".content-title{-fx-font-size:16px;}" +
        ".content-subtitle{-fx-font-size:11.5px;}" +
        ".card{-fx-padding:8 12 0 12;-fx-min-height:58;}" +
        ".card-value{-fx-font-size:20px;}" +
        ".incidents-table .table-row-cell{-fx-pref-height:30;}" +
        ".incidents-table .table-cell{-fx-padding:2 6;}" +
        ".filter-btn{-fx-padding:2 7;-fx-font-size:10.5px;}" +
        ".nav-label{-fx-font-size:11.5px;}" +
        ".app-topbar{-fx-min-height:40px;-fx-max-height:40px;-fx-pref-height:40px;}" +
        ".sync-card{-fx-padding:8 12;}" +
        ".recent-card-head{-fx-padding:6 10;}" +
        ".recent-row{-fx-padding:5 10;}";

    private String compactDataUri;

    @Override public String getId()      { return "fr.quartierconnect.plugin.compact"; }
    @Override public String getName()    { return I18n.get("plugin.compact.name"); }
    @Override public String getVersion() { return "1.0.0"; }
    @Override public String getDescription() { return I18n.get("plugin.compact.description"); }
    @Override public void setContext(AppContext ctx) { this.context = ctx; }

    @Override
    public void onLoad() {
        try {
            compactDataUri = "data:text/css;charset=utf-8,"
                    + URLEncoder.encode(COMPACT_CSS, StandardCharsets.UTF_8).replace("+", "%20");
        } catch (Exception ignored) {}
    }

    @Override
    public void onUnload() {
        if (compactActive) deactivate();
    }

    @Override
    public Node getPanel() {
        Label desc = new Label(I18n.get("plugin.compact.panelDesc"));
        desc.setStyle("-fx-font-size: 12.5px; -fx-text-fill: -color-fg-muted;");
        desc.setWrapText(true);

        ToggleButton toggle = new ToggleButton(compactActive ? I18n.get("plugin.compact.enabled") : I18n.get("plugin.compact.enable"));
        toggle.setSelected(compactActive);
        toggle.setStyle("-fx-background-radius: 6; -fx-border-radius: 6; -fx-padding: 5 14; "
                + "-fx-font-size: 12px; -fx-cursor: hand;");
        toggle.setOnAction(e -> {
            if (toggle.isSelected()) {
                activate();
                toggle.setText(I18n.get("plugin.compact.enabled"));
            } else {
                deactivate();
                toggle.setText(I18n.get("plugin.compact.enable"));
            }
        });

        Label note = new Label(I18n.get("plugin.compact.note"));
        note.setStyle("-fx-font-size: 12px; -fx-text-fill: -color-fg-subtle;");

        HBox toggleRow = new HBox(10, toggle);
        toggleRow.setAlignment(Pos.CENTER_LEFT);

        return new VBox(8, desc, toggleRow, note);
    }

    private void activate() {
        if (compactDataUri == null || context == null || context.getScene() == null) return;
        compactActive = true;
        context.getScene().getStylesheets().add(compactDataUri);
    }

    private void deactivate() {
        if (compactDataUri == null || context == null || context.getScene() == null) return;
        compactActive = false;
        context.getScene().getStylesheets().remove(compactDataUri);
    }
}
