package fr.quartierconnect.desktopapp.plugin;

import fr.quartierconnect.desktopapp.database.IncidentRepository;
import fr.quartierconnect.desktopapp.i18n.I18n;
import javafx.application.Platform;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.control.Alert;
import javafx.scene.control.Label;
import javafx.scene.control.ToggleButton;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

/**
 * Built-in plugin — monitors conflicts via the EventBus (INCIDENTS_CHANGED)
 * and shows a JavaFX Alert when new conflicts are detected.
 */
public class NotificationPlugin implements QuartierConnectPlugin, PluginRegistry.ContextAwarePlugin, ViewablePlugin {

    private AppContext context;
    private Consumer<PluginEventBus.EventData> eventListener;
    private volatile boolean alertsEnabled = true;
    private final AtomicInteger lastKnownConflicts = new AtomicInteger(0);

    private Label statusLabel;

    @Override public String getId()      { return "fr.quartierconnect.plugin.notifications"; }
    @Override public String getName()    { return I18n.get("plugin.notifications.name"); }
    @Override public String getVersion() { return "1.0.0"; }
    @Override public String getDescription() { return I18n.get("plugin.notifications.description"); }

    @Override
    public void setContext(AppContext ctx) { this.context = ctx; }

    @Override
    public void onLoad() {
        if (context != null && context.getEventBus() != null) {
            eventListener = this::handleEvent;
            context.getEventBus().subscribe(eventListener);
        }
    }

    @Override
    public void onUnload() {
        if (context != null && context.getEventBus() != null && eventListener != null) {
            context.getEventBus().unsubscribe(eventListener);
            eventListener = null;
        }
    }

    @Override
    public Node getPanel() {
        Label desc = new Label(I18n.get("plugin.notifications.panelDesc"));
        desc.setStyle("-fx-font-size: 11.5px; -fx-text-fill: -color-fg-muted;");
        desc.setWrapText(true);

        ToggleButton toggle = new ToggleButton(alertsEnabled
                ? I18n.get("plugin.notifications.enabled")
                : I18n.get("plugin.notifications.disabled"));
        toggle.setSelected(alertsEnabled);
        toggle.setStyle("-fx-background-radius: 6; -fx-border-radius: 6; -fx-padding: 5 14; "
                + "-fx-font-size: 12px; -fx-cursor: hand;");
        toggle.setOnAction(e -> {
            alertsEnabled = toggle.isSelected();
            toggle.setText(alertsEnabled
                    ? I18n.get("plugin.notifications.enabled")
                    : I18n.get("plugin.notifications.disabled"));
            if (statusLabel != null) {
                statusLabel.setText(alertsEnabled
                        ? I18n.get("plugin.notifications.monitoringActive")
                        : I18n.get("plugin.notifications.monitoringPaused"));
                statusLabel.setStyle("-fx-font-size: 11px; -fx-font-family: monospace; -fx-text-fill: "
                        + (alertsEnabled ? "#15803d" : "#71717a") + ";");
            }
        });

        statusLabel = new Label(I18n.get("plugin.notifications.monitoringActive"));
        statusLabel.setStyle("-fx-font-size: 11px; -fx-font-family: monospace; -fx-text-fill: #15803d;");

        HBox toggleRow = new HBox(10, toggle, statusLabel);
        toggleRow.setAlignment(Pos.CENTER_LEFT);

        return new VBox(8, desc, toggleRow);
    }

    private void handleEvent(PluginEventBus.EventData data) {
        if (data.event() != PluginEventBus.Event.INCIDENTS_CHANGED) return;
        checkConflicts();
    }

    private void checkConflicts() {
        if (!alertsEnabled) return;
        try {
            IncidentRepository repo = context != null ? context.getIncidentRepository() : new IncidentRepository();
            long conflicts = repo.listConflicts().size();
            int previous = lastKnownConflicts.getAndSet((int) conflicts);
            if (conflicts > previous && conflicts > 0) {
                long newConflicts = conflicts - previous;
                Platform.runLater(() -> {
                    Alert alert = new Alert(Alert.AlertType.WARNING);
                    alert.setTitle(I18n.get("plugin.notifications.alertTitle"));
                    alert.setHeaderText(newConflicts > 1
                            ? I18n.get("plugin.notifications.alertHeaderMany", newConflicts)
                            : I18n.get("plugin.notifications.alertHeaderOne", newConflicts));
                    alert.setContentText(I18n.get("plugin.notifications.alertContent"));
                    alert.show();
                });
            }
        } catch (Exception ignored) {}
    }
}
