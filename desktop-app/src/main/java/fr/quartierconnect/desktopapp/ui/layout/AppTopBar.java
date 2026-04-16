package fr.quartierconnect.desktopapp.ui.layout;

import fr.quartierconnect.desktopapp.plugin.PluginRegistry;
import fr.quartierconnect.desktopapp.services.ApiService;
import javafx.application.Platform;
import javafx.collections.ListChangeListener;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Label;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class AppTopBar extends HBox {

    private final Label breadcrumb    = new Label("Tableau de bord");
    private final Label connectBadge  = new Label("● …");
    private final HBox  pluginSlot    = new HBox(8);

    private final ScheduledExecutorService poller = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "topbar-connectivity");
        t.setDaemon(true);
        return t;
    });

    public AppTopBar() {
        this("QC");
    }

    public AppTopBar(String initials) {
        getStyleClass().add("app-topbar");
        setAlignment(Pos.CENTER_LEFT);
        setPadding(new Insets(0, 20, 0, 20));
        setSpacing(12);

        breadcrumb.getStyleClass().add("topbar-breadcrumb");
        connectBadge.getStyleClass().add("topbar-connect-checking");
        pluginSlot.setAlignment(Pos.CENTER_LEFT);

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        Label avatar = new Label(initials.isEmpty() ? "?" : initials);
        avatar.getStyleClass().add("topbar-avatar");

        getChildren().addAll(breadcrumb, spacer, pluginSlot, connectBadge, avatar);

        bindPluginSlot();
        startPolling();
    }

    private void bindPluginSlot() {
        syncPluginSlot();
        PluginRegistry.getInstance().getTopBarSlot().addListener(
            (ListChangeListener<javafx.scene.Node>) change ->
                Platform.runLater(this::syncPluginSlot)
        );
    }

    private void syncPluginSlot() {
        pluginSlot.getChildren().setAll(PluginRegistry.getInstance().getTopBarSlot());
    }

    public void setBreadcrumb(String text) {
        breadcrumb.setText(text);
    }

    public void shutdown() {
        poller.shutdownNow();
    }

    // ── Connectivity polling ────────────────────────────────────────────────

    private void startPolling() {
        poller.scheduleAtFixedRate(() -> {
            boolean online = ApiService.isReachable();
            Platform.runLater(() -> applyConnectState(online));
        }, 0, 30, TimeUnit.SECONDS);
    }

    private void applyConnectState(boolean online) {
        connectBadge.setText(online ? "● API connectée" : "● API hors ligne");
        connectBadge.getStyleClass().setAll(
            online ? "topbar-connect-online" : "topbar-connect-offline"
        );
    }
}
