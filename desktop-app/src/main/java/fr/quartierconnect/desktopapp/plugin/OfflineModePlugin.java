package fr.quartierconnect.desktopapp.plugin;

import atlantafx.base.controls.ToggleSwitch;
import fr.quartierconnect.desktopapp.i18n.I18n;
import fr.quartierconnect.desktopapp.services.ApiService;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.control.Label;
import javafx.scene.control.Tooltip;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import org.kordamp.ikonli.fontawesome5.FontAwesomeSolid;
import org.kordamp.ikonli.javafx.FontIcon;
import atlantafx.base.theme.Styles;

/**
 * Built-in plugin — adds a toggle to the top bar that forces offline mode.
 * When active, all API calls are blocked; SyncService will stop pushing/pulling.
 * Useful for testing the offline-first SQLite behaviour without killing the network.
 */
public class OfflineModePlugin implements QuartierConnectPlugin, PluginRegistry.ContextAwarePlugin, ViewablePlugin {

    private AppContext context;
    private HBox injectedToggle;

    @Override public String getId()      { return "fr.quartierconnect.plugin.offline-mode"; }
    @Override public String getName()    { return I18n.get("plugin.offline.name"); }
    @Override public String getVersion() { return "1.0.0"; }
    @Override public String getDescription() { return I18n.get("plugin.offline.description"); }

    @Override
    public void setContext(AppContext ctx) { this.context = ctx; }

    @Override
    public void onLoad() {
        FontIcon planeIcon = new FontIcon(FontAwesomeSolid.BAN);
        planeIcon.setIconSize(13);
        planeIcon.setStyle("-fx-icon-color: -color-fg-subtle;");

        ToggleSwitch toggle = new ToggleSwitch();
        toggle.setSelected(ApiService.isOfflineMode());
        toggle.setTooltip(new Tooltip(I18n.get("plugin.offline.tooltip")));

        Label lbl = new Label(I18n.get("plugin.offline.label"));
        lbl.setStyle("-fx-font-size: 10.5px; -fx-text-fill: -color-fg-subtle; -fx-padding: 0 0 0 4;");

        injectedToggle = new HBox(8, planeIcon, lbl, toggle);
        injectedToggle.setAlignment(Pos.CENTER_LEFT);
        injectedToggle.setStyle("-fx-padding: 0 10 0 0;");

        toggle.selectedProperty().addListener((obs, oldVal, newVal) -> {
            ApiService.setOfflineMode(newVal);
            String color = newVal ? "-color-warning-fg" : "-color-fg-subtle";
            lbl.setStyle("-fx-font-size: 10.5px; -fx-text-fill: " + color + "; -fx-padding: 0 0 0 4;");
            planeIcon.setStyle("-fx-icon-color: " + color + ";");
        });

        PluginRegistry.getInstance().getTopBarSlot().add(injectedToggle);
    }

    @Override
    public void onUnload() {
        ApiService.setOfflineMode(false);
        if (injectedToggle != null) {
            PluginRegistry.getInstance().getTopBarSlot().remove(injectedToggle);
            injectedToggle = null;
        }
    }

    @Override
    public Node getPanel() {
        Label desc = new Label(I18n.get("plugin.offline.panelDesc"));
        desc.setStyle("-fx-font-size: 11.5px; -fx-text-fill: -color-fg-muted;");
        desc.setWrapText(true);

        Label status = new Label(ApiService.isOfflineMode()
                ? I18n.get("plugin.offline.statusOffline")
                : I18n.get("plugin.offline.statusOnline"));
        status.setStyle("-fx-font-size: 11px; -fx-font-family: monospace; -fx-text-fill: "
                + (ApiService.isOfflineMode() ? "-color-warning-fg" : "-color-success-fg") + ";");

        return new VBox(8, desc, status);
    }
}
