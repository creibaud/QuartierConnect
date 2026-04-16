package fr.quartierconnect.desktopapp.views;

import atlantafx.base.controls.ToggleSwitch;
import fr.quartierconnect.desktopapp.plugin.PluginRegistry;
import fr.quartierconnect.desktopapp.plugin.QuartierConnectPlugin;
import fr.quartierconnect.desktopapp.plugin.ViewablePlugin;
import fr.quartierconnect.desktopapp.ui.components.AppButton;
import fr.quartierconnect.desktopapp.ui.components.AppModal;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Label;
import javafx.scene.control.ScrollPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import org.kordamp.ikonli.fontawesome5.FontAwesomeSolid;
import org.kordamp.ikonli.javafx.FontIcon;

import java.util.List;

public class PluginsView {

    private final AppModal appModal;
    private final VBox root;

    public PluginsView(AppModal appModal) {
        this.appModal = appModal;
        this.root = buildLayout();
    }

    public VBox getRoot() {
        return root;
    }

    private VBox buildLayout() {
        Label pageTitle = new Label("Plugins installés");
        pageTitle.getStyleClass().add("content-title");

        Label pageSubtitle = new Label("Extensions chargées au démarrage · PluginRegistry · ServiceLoader");
        pageSubtitle.getStyleClass().add("content-subtitle");

        VBox titleBlock = new VBox(3, pageTitle, pageSubtitle);
        VBox.setMargin(titleBlock, new Insets(0, 0, 16, 0));

        HBox infoBox = buildInfoBox();
        VBox.setMargin(infoBox, new Insets(0, 0, 16, 0));

        List<QuartierConnectPlugin> plugins = PluginRegistry.getInstance().getPlugins();

        VBox pluginsList = new VBox(8);
        if (plugins.isEmpty()) {
            pluginsList.getChildren().add(buildEmptyState());
        } else {
            String[] borderColors = {"#7c3aed", "#059669", "#2563eb", "#b45309", "#dc2626"};
            String[] gradients = {
                "linear-gradient(135deg, #4c1d95, #7c3aed)",
                "linear-gradient(135deg, #064e3b, #10b981)",
                "linear-gradient(135deg, #1e3a8a, #3b82f6)",
                "linear-gradient(135deg, #78350f, #f59e0b)",
                "linear-gradient(135deg, #7f1d1d, #dc2626)"
            };
            for (int i = 0; i < plugins.size(); i++) {
                String border = borderColors[i % borderColors.length];
                String grad = gradients[i % gradients.length];
                pluginsList.getChildren().add(buildPluginCard(plugins.get(i), border, grad));
            }
        }

        VBox dirRow = buildDirInfoRow(plugins.size());
        VBox.setMargin(dirRow, new Insets(14, 0, 0, 0));

        VBox scrollContent = new VBox(0, titleBlock, infoBox, pluginsList, dirRow);
        scrollContent.setPadding(new Insets(22, 22, 14, 22));

        ScrollPane scroll = new ScrollPane(scrollContent);
        scroll.setFitToWidth(true);
        scroll.getStyleClass().add("content-scroll");
        VBox.setVgrow(scroll, Priority.ALWAYS);

        VBox layout = new VBox(0, scroll);
        layout.getStyleClass().add("content-area");
        return layout;
    }

    private HBox buildInfoBox() {
        FontIcon infoIcon = new FontIcon(FontAwesomeSolid.INFO_CIRCLE);
        infoIcon.setIconSize(14);
        infoIcon.setStyle("-fx-icon-color: -color-accent-fg;");

        Label text = new Label(
            "Les plugins sont chargés depuis le dossier plugins/ via URLClassLoader + ServiceLoader<QuartierConnectPlugin>. "
            + "Chaque JAR doit déclarer ses implémentations dans META-INF/services/. "
            + "onLoad() est appelé au chargement, onUnload() à la déconnexion ou au retrait."
        );
        text.getStyleClass().add("plugin-info-box-text");
        text.setWrapText(true);
        HBox.setHgrow(text, Priority.ALWAYS);

        HBox box = new HBox(8, infoIcon, text);
        box.setAlignment(Pos.TOP_LEFT);
        box.getStyleClass().add("plugin-info-box");
        return box;
    }

    private VBox buildPluginCard(QuartierConnectPlugin plugin, String borderColor, String gradient) {
        Region iconBg = new Region();
        iconBg.setStyle("-fx-background-color: " + gradient + "; -fx-background-radius: 10; "
                + "-fx-min-width: 40; -fx-max-width: 40; -fx-min-height: 40; -fx-max-height: 40; "
                + "-fx-effect: dropshadow(gaussian, rgba(0,0,0,0.12), 8, 0, 0, 2);");

        FontIcon pluginIcon = new FontIcon(FontAwesomeSolid.PUZZLE_PIECE);
        pluginIcon.setIconSize(16);
        pluginIcon.setStyle("-fx-icon-color: white;");

        StackPane iconWrapper = new StackPane(iconBg, pluginIcon);
        iconWrapper.setAlignment(Pos.CENTER);
        iconWrapper.setMinSize(40, 40);
        iconWrapper.setMaxSize(40, 40);

        Label nameLbl = new Label(plugin.getName());
        nameLbl.getStyleClass().add("plugin-name-lbl");

        Label versionLbl = new Label("v" + plugin.getVersion());
        versionLbl.getStyleClass().add("plugin-version-lbl");

        HBox nameRow = new HBox(7, nameLbl, versionLbl);
        nameRow.setAlignment(Pos.CENTER_LEFT);

        String description = plugin.getDescription();
        Label descLbl = new Label(description != null && !description.isEmpty() ? description : plugin.getId());
        descLbl.setStyle("-fx-font-size: 11px; -fx-text-fill: -color-fg-muted;");
        descLbl.setWrapText(true);

        Label idLbl = new Label(plugin.getId());
        idLbl.getStyleClass().add("plugin-id-lbl");

        Label tagLbl = new Label(plugin instanceof ViewablePlugin ? "Plugin · Configurable" : "Plugin");
        tagLbl.setStyle("-fx-background-color: " + getLightColor(borderColor) + "; -fx-text-fill: " + borderColor
                + "; -fx-background-radius: 4; -fx-padding: 2 7; -fx-font-size: 9px; -fx-font-weight: bold;");
        VBox.setMargin(tagLbl, new Insets(4, 0, 0, 0));

        Label statusDot = new Label("● Chargé · onLoad() OK");
        statusDot.setStyle("-fx-text-fill: -color-success-fg; -fx-font-size: 11px;");
        VBox.setMargin(statusDot, new Insets(6, 0, 0, 0));

        VBox info = new VBox(0, nameRow, descLbl, idLbl, tagLbl, statusDot);
        HBox.setHgrow(info, Priority.ALWAYS);

        VBox actions = new VBox(6);
        actions.setAlignment(Pos.TOP_RIGHT);

        ToggleSwitch toggle = new ToggleSwitch();
        toggle.setSelected(PluginRegistry.getInstance().isEnabled(plugin.getId()));
        toggle.selectedProperty().addListener((obs, oldVal, newVal) -> {
            if (newVal) {
                PluginRegistry.getInstance().enable(plugin.getId());
                statusDot.setText("● Chargé · onLoad() OK");
                statusDot.setStyle("-fx-text-fill: -color-success-fg; -fx-font-size: 11px;");
            } else {
                PluginRegistry.getInstance().disable(plugin.getId());
                statusDot.setText("○ Désactivé · onUnload() appelé");
                statusDot.setStyle("-fx-text-fill: -color-fg-muted; -fx-font-size: 11px;");
            }
        });
        actions.getChildren().add(toggle);

        if (plugin instanceof ViewablePlugin viewable) {
            AppButton configBtn = new AppButton("Configurer", AppButton.Variant.SECONDARY);
            configBtn.disableProperty().bind(toggle.selectedProperty().not());
            configBtn.setOnAction(e -> appModal.showWide("Configurer — " + plugin.getName(), viewable.getPanel()));
            actions.getChildren().add(configBtn);
        }

        VBox card = new VBox(0);
        HBox cardRow = new HBox(14, iconWrapper, info, actions);
        cardRow.setAlignment(Pos.TOP_LEFT);
        cardRow.setPadding(new Insets(14, 16, 14, 16));
        card.getChildren().add(cardRow);
        card.setStyle("-fx-border-color: " + borderColor + " transparent transparent transparent; "
                + "-fx-border-width: 0 0 0 3; "
                + "-fx-background-color: -color-bg-default; -fx-background-radius: 11; "
                + "-fx-border-radius: 11; "
                + "-fx-effect: dropshadow(gaussian, rgba(0,0,0,0.04), 6, 0, 0, 1);");

        return card;
    }

    private VBox buildEmptyState() {
        Label icon = new Label("🧩");
        icon.setStyle("-fx-font-size: 28px; -fx-opacity: 0.25;");
        icon.setAlignment(Pos.CENTER);

        Label title = new Label("Aucun plugin installé.");
        title.setStyle("-fx-font-size: 13.5px; -fx-font-weight: bold; -fx-text-fill: -color-fg-muted;");
        title.setAlignment(Pos.CENTER);

        Label sub = new Label("Déposez des fichiers .jar dans le dossier plugins/ pour les charger.");
        sub.setStyle("-fx-font-size: 12px; -fx-font-family: monospace; -fx-text-fill: -color-fg-subtle;");
        sub.setAlignment(Pos.CENTER);
        sub.setWrapText(true);

        VBox state = new VBox(10, icon, title, sub);
        state.setAlignment(Pos.CENTER);
        state.getStyleClass().add("plugin-empty");
        state.setMaxWidth(Double.MAX_VALUE);
        return state;
    }

    private VBox buildDirInfoRow(int totalPlugins) {
        Label dirTitle = new Label("Dossier plugins");
        dirTitle.getStyleClass().add("plugin-dir-lbl");

        Label dirSub = new Label("./plugins/  ·  " + totalPlugins + " JAR(s) scannés  ·  " + totalPlugins + " chargés");
        dirSub.getStyleClass().add("plugin-dir-sub");

        VBox info = new VBox(2, dirTitle, dirSub);
        HBox.setHgrow(info, Priority.ALWAYS);

        AppButton rescanBtn = new AppButton("Rescanner plugins/", AppButton.Variant.SECONDARY);
        rescanBtn.setGraphic(makeIcon(FontAwesomeSolid.SYNC_ALT, 11));
        rescanBtn.setGraphicTextGap(6);
        rescanBtn.setOnAction(e -> {});

        HBox row = new HBox(info, rescanBtn);
        row.setAlignment(Pos.CENTER_LEFT);
        row.getStyleClass().add("detail-card");
        row.setPadding(new Insets(10, 14, 10, 14));

        return new VBox(row);
    }

    private FontIcon makeIcon(org.kordamp.ikonli.Ikon icon, int size) {
        FontIcon fi = new FontIcon(icon);
        fi.setIconSize(size);
        return fi;
    }

    private String getLightColor(String hex) {
        return switch (hex) {
            case "#7c3aed" -> "#ede9fe";
            case "#059669" -> "#d1fae5";
            case "#2563eb" -> "#eff6ff";
            case "#b45309" -> "#fef3c7";
            case "#dc2626" -> "#fee2e2";
            default -> "#f5f5f6";
        };
    }
}
