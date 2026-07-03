package fr.quartierconnect.desktopapp.views;

import atlantafx.base.controls.ToggleSwitch;
import fr.quartierconnect.desktopapp.i18n.I18n;
import fr.quartierconnect.desktopapp.plugin.AppContext;
import fr.quartierconnect.desktopapp.plugin.ExportPlugin;
import fr.quartierconnect.desktopapp.plugin.PluginRegistry;
import fr.quartierconnect.desktopapp.plugin.QuartierConnectPlugin;
import fr.quartierconnect.desktopapp.plugin.ViewablePlugin;
import fr.quartierconnect.desktopapp.ui.components.AppButton;
import fr.quartierconnect.desktopapp.ui.components.AppModal;
import fr.quartierconnect.desktopapp.ui.components.ToastManager;
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

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

public class PluginsView {

    private static final Path PLUGINS_DIRECTORY = Paths.get("plugins");

    private final AppModal appModal;
    private final VBox pluginListContainer = new VBox(8);
    private final Label dirInfoLabel = new Label();
    private final Label builtinInfoLabel = new Label();
    private final VBox root;

    public PluginsView(AppModal appModal) {
        this.appModal = appModal;
        this.root = buildLayout();
    }

    public VBox getRoot() {
        return root;
    }

    private VBox buildLayout() {
        Label pageTitle = new Label(I18n.get("plugins.title"));
        pageTitle.getStyleClass().add("content-title");

        Label pageSubtitle = new Label(I18n.get("plugins.subtitle"));
        pageSubtitle.getStyleClass().add("content-subtitle");

        VBox titleBlock = new VBox(3, pageTitle, pageSubtitle);
        VBox.setMargin(titleBlock, new Insets(0, 0, 16, 0));

        HBox infoBox = buildInfoBox();
        VBox.setMargin(infoBox, new Insets(0, 0, 16, 0));

        rebuildPluginList();

        VBox dirRow = buildDirInfoRow();
        VBox.setMargin(dirRow, new Insets(14, 0, 0, 0));
        refreshDirInfo();

        VBox scrollContent = new VBox(0, titleBlock, infoBox, pluginListContainer, dirRow);
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

        Label text = new Label(I18n.get("plugins.info"));
        text.getStyleClass().add("plugin-info-box-text");
        text.setWrapText(true);
        HBox.setHgrow(text, Priority.ALWAYS);

        HBox box = new HBox(8, infoIcon, text);
        box.setAlignment(Pos.TOP_LEFT);
        box.getStyleClass().add("plugin-info-box");
        return box;
    }

    private void rebuildPluginList() {
        pluginListContainer.getChildren().clear();
        List<QuartierConnectPlugin> plugins = PluginRegistry.getInstance().getPlugins();
        if (plugins.isEmpty()) {
            pluginListContainer.getChildren().add(buildEmptyState());
            return;
        }
        for (QuartierConnectPlugin plugin : plugins) {
            pluginListContainer.getChildren().add(buildPluginCard(plugin));
        }
    }

    private VBox buildPluginCard(QuartierConnectPlugin plugin) {
        StackPane iconWrapper = buildPluginIcon(plugin);

        Label nameLbl = new Label(plugin.getName());
        nameLbl.getStyleClass().add("plugin-name-lbl");

        Label versionLbl = new Label("v" + plugin.getVersion());
        versionLbl.getStyleClass().add("plugin-version-lbl");

        HBox nameRow = new HBox(7, nameLbl, versionLbl);
        nameRow.setAlignment(Pos.CENTER_LEFT);

        String description = plugin.getDescription();
        Label descLbl = new Label(description != null && !description.isEmpty() ? description : plugin.getId());
        descLbl.setStyle("-fx-font-size: 12.5px; -fx-text-fill: -color-fg-muted;");
        descLbl.setWrapText(true);

        Label idLbl = new Label(plugin.getId());
        idLbl.getStyleClass().add("plugin-id-lbl");

        Label tagLbl = new Label(tagTextFor(plugin));
        tagLbl.setStyle("-fx-background-color: -color-accent-subtle; -fx-text-fill: -color-accent-fg; "
                + "-fx-background-radius: 4; -fx-padding: 2 7; -fx-font-size: 10.5px; -fx-font-weight: bold;");
        VBox.setMargin(tagLbl, new Insets(4, 0, 0, 0));

        Label statusDot = new Label(I18n.get("plugins.loaded"));
        statusDot.setStyle("-fx-text-fill: -color-success-fg; -fx-font-size: 12.5px;");
        VBox.setMargin(statusDot, new Insets(6, 0, 0, 0));

        VBox info = new VBox(0, nameRow, descLbl, idLbl, tagLbl, statusDot);
        HBox.setHgrow(info, Priority.ALWAYS);

        VBox actions = buildPluginActions(plugin, statusDot);

        HBox cardRow = new HBox(14, iconWrapper, info, actions);
        cardRow.setAlignment(Pos.TOP_LEFT);
        cardRow.setPadding(new Insets(14, 16, 14, 16));

        VBox card = new VBox(cardRow);
        card.setStyle("-fx-border-color: transparent transparent transparent -color-accent-emphasis; "
                + "-fx-border-width: 0 0 0 3; "
                + "-fx-background-color: -color-bg-default; -fx-background-radius: 11; "
                + "-fx-border-radius: 11; "
                + "-fx-effect: dropshadow(gaussian, rgba(0,0,0,0.04), 6, 0, 0, 1);");
        return card;
    }

    private StackPane buildPluginIcon(QuartierConnectPlugin plugin) {
        Region iconBg = new Region();
        iconBg.setStyle("-fx-background-color: -color-accent-subtle; -fx-background-radius: 10; "
                + "-fx-min-width: 40; -fx-max-width: 40; -fx-min-height: 40; -fx-max-height: 40;");

        FontIcon pluginIcon = new FontIcon(iconFor(plugin.getId()));
        pluginIcon.setIconSize(16);
        pluginIcon.setStyle("-fx-icon-color: -color-accent-fg;");

        StackPane iconWrapper = new StackPane(iconBg, pluginIcon);
        iconWrapper.setAlignment(Pos.CENTER);
        iconWrapper.setMinSize(40, 40);
        iconWrapper.setMaxSize(40, 40);
        return iconWrapper;
    }

    private static FontAwesomeSolid iconFor(String pluginId) {
        return switch (pluginId) {
            case "fr.quartierconnect.plugin.theme"         -> FontAwesomeSolid.PAINT_BRUSH;
            case "fr.quartierconnect.plugin.compact"       -> FontAwesomeSolid.COMPRESS;
            case "fr.quartierconnect.plugin.export"        -> FontAwesomeSolid.FILE_CSV;
            case "fr.quartierconnect.plugin.notifications" -> FontAwesomeSolid.BELL;
            case "fr.quartierconnect.plugin.offline"       -> FontAwesomeSolid.PLANE;
            case "fr.quartierconnect.plugin.lang.es"       -> FontAwesomeSolid.LANGUAGE;
            default                                        -> FontAwesomeSolid.PUZZLE_PIECE;
        };
    }

    private static String tagTextFor(QuartierConnectPlugin plugin) {
        if (isExternal(plugin)) {
            return I18n.get("plugins.tagExternal");
        }
        return plugin instanceof ViewablePlugin
                ? I18n.get("plugins.tagConfigurable")
                : I18n.get("plugins.tag");
    }

    private VBox buildPluginActions(QuartierConnectPlugin plugin, Label statusDot) {
        VBox actions = new VBox(6);
        actions.setAlignment(Pos.TOP_RIGHT);

        ToggleSwitch toggle = new ToggleSwitch();
        toggle.setSelected(PluginRegistry.getInstance().isEnabled(plugin.getId()));
        toggle.selectedProperty().addListener((obs, oldVal, newVal) -> {
            if (newVal) {
                PluginRegistry.getInstance().enable(plugin.getId());
                statusDot.setText(I18n.get("plugins.loaded"));
                statusDot.setStyle("-fx-text-fill: -color-success-fg; -fx-font-size: 12.5px;");
            } else {
                PluginRegistry.getInstance().disable(plugin.getId());
                statusDot.setText(I18n.get("plugins.disabled"));
                statusDot.setStyle("-fx-text-fill: -color-fg-muted; -fx-font-size: 12.5px;");
            }
        });
        actions.getChildren().add(toggle);

        if (plugin instanceof ViewablePlugin viewable) {
            AppButton configBtn = new AppButton(I18n.get("plugins.configure"), AppButton.Variant.SECONDARY);
            configBtn.disableProperty().bind(toggle.selectedProperty().not());
            configBtn.setOnAction(e -> appModal.showWide(I18n.get("plugins.configureTitle", plugin.getName()), viewable.getPanel()));
            actions.getChildren().add(configBtn);
        }
        return actions;
    }

    private VBox buildEmptyState() {
        FontIcon icon = new FontIcon(FontAwesomeSolid.PUZZLE_PIECE);
        icon.setIconSize(28);
        icon.setStyle("-fx-icon-color: -color-fg-muted; -fx-opacity: 0.25;");

        Label title = new Label(I18n.get("plugins.empty.title"));
        title.setStyle("-fx-font-size: 13.5px; -fx-font-weight: bold; -fx-text-fill: -color-fg-muted;");
        title.setAlignment(Pos.CENTER);

        Label sub = new Label(I18n.get("plugins.empty.subtitle"));
        sub.setStyle("-fx-font-size: 12px; -fx-font-family: monospace; -fx-text-fill: -color-fg-subtle;");
        sub.setAlignment(Pos.CENTER);
        sub.setWrapText(true);

        VBox state = new VBox(10, icon, title, sub);
        state.setAlignment(Pos.CENTER);
        state.getStyleClass().add("plugin-empty");
        state.setMaxWidth(Double.MAX_VALUE);
        return state;
    }

    private VBox buildDirInfoRow() {
        Label dirTitle = new Label(I18n.get("plugins.dir"));
        dirTitle.getStyleClass().add("plugin-dir-lbl");

        dirInfoLabel.getStyleClass().add("plugin-dir-sub");
        builtinInfoLabel.getStyleClass().add("plugin-dir-sub");

        VBox info = new VBox(2, dirTitle, dirInfoLabel, builtinInfoLabel);
        HBox.setHgrow(info, Priority.ALWAYS);

        AppButton rescanBtn = new AppButton(I18n.get("plugins.rescan"), AppButton.Variant.SECONDARY);
        rescanBtn.setGraphic(makeIcon(FontAwesomeSolid.SYNC_ALT, 11));
        rescanBtn.setGraphicTextGap(6);
        rescanBtn.setOnAction(e -> rescanPluginsDirectory());

        HBox row = new HBox(info, rescanBtn);
        row.setAlignment(Pos.CENTER_LEFT);
        row.getStyleClass().add("detail-card");
        row.setPadding(new Insets(10, 14, 10, 14));

        return new VBox(row);
    }

    // ── Réanalyse ───────────────────────────────────────────────────────────

    private void rescanPluginsDirectory() {
        PluginRegistry registry = PluginRegistry.getInstance();
        AppContext context = findAppContext();

        unloadExternalPlugins(registry);
        if (context != null) {
            registry.loadFromDirectory(PLUGINS_DIRECTORY, context);
        }

        rebuildPluginList();
        refreshDirInfo();
        showRescanResult(context);
    }

    private void unloadExternalPlugins(PluginRegistry registry) {
        List<QuartierConnectPlugin> externals = registry.getPlugins().stream()
                .filter(PluginsView::isExternal)
                .toList();
        externals.forEach(plugin -> registry.unregister(plugin.getId()));
    }

    private void showRescanResult(AppContext context) {
        ToastManager toast = context != null ? context.getToastManager() : null;
        if (toast == null) return;
        long external = countExternalPlugins();
        if (external > 0) {
            toast.showSuccess(I18n.get("plugins.rescan.loaded", external));
        } else {
            toast.showInfo(I18n.get("plugins.rescan.none"));
        }
    }

    private void refreshDirInfo() {
        long external = countExternalPlugins();
        long builtIn = PluginRegistry.getInstance().getPlugins().size() - external;
        dirInfoLabel.setText(I18n.get("plugins.dirInfo", countScannedJars(), external));
        builtinInfoLabel.setText(I18n.get("plugins.builtinInfo", builtIn));
    }

    private static long countExternalPlugins() {
        return PluginRegistry.getInstance().getPlugins().stream()
                .filter(PluginsView::isExternal)
                .count();
    }

    /** Les plugins intégrés partagent le class loader de l'application ; les plugins JAR vivent dans leur propre URLClassLoader. */
    private static boolean isExternal(QuartierConnectPlugin plugin) {
        return plugin.getClass().getClassLoader() != PluginsView.class.getClassLoader();
    }

    private static long countScannedJars() {
        if (!Files.isDirectory(PLUGINS_DIRECTORY)) return 0;
        try (Stream<Path> entries = Files.list(PLUGINS_DIRECTORY)) {
            return entries.filter(p -> p.toString().endsWith(".jar")).count();
        } catch (IOException e) {
            return 0;
        }
    }

    private static AppContext findAppContext() {
        return PluginRegistry.getInstance().getPlugins().stream()
                .filter(ExportPlugin.class::isInstance)
                .map(plugin -> ((ExportPlugin) plugin).getAppContext())
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private FontIcon makeIcon(org.kordamp.ikonli.Ikon icon, int size) {
        FontIcon fi = new FontIcon(icon);
        fi.setIconSize(size);
        return fi;
    }
}
