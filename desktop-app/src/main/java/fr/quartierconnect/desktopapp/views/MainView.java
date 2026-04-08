package fr.quartierconnect.desktopapp.views;

import fr.quartierconnect.desktopapp.plugin.PluginRegistry;
import fr.quartierconnect.desktopapp.plugin.QuartierConnectPlugin;
import fr.quartierconnect.desktopapp.services.AuthService;
import fr.quartierconnect.desktopapp.services.SyncService;
import fr.quartierconnect.desktopapp.services.UpdateService;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Parent;
import javafx.scene.control.Alert;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

import java.util.function.Consumer;

@SuppressWarnings("FieldCanBeLocal")

public class MainView {

    private final Stage stage;
    private final Consumer<String> openBrowser;
    private final BorderPane root;
    private final SyncService syncService = new SyncService();
    private final UpdateService updateService = new UpdateService();
    private final Label statusLabel = new Label("● Connexion…");
    private final IncidentsView incidentsView = new IncidentsView();

    public MainView(Stage stage, Consumer<String> openBrowser) {
        this.stage = stage;
        this.openBrowser = openBrowser;
        this.root = buildLayout();
        startSync();
        startUpdateChecker();
    }

    public Parent getRoot() {
        return root;
    }

    private BorderPane buildLayout() {
        BorderPane layout = new BorderPane();
        layout.setLeft(buildSidebar());
        layout.setTop(buildTopBar());
        layout.setCenter(buildContent());
        return layout;
    }

    private VBox buildSidebar() {
        Label appName = new Label("QuartierConnect");
        appName.getStyleClass().add("sidebar-title");

        Button dashboardBtn = menuButton("Tableau de bord");
        dashboardBtn.setOnAction(e -> root.setCenter(buildContent()));

        Button incidentsBtn = menuButton("Incidents");
        incidentsBtn.setOnAction(e -> root.setCenter(incidentsView.getRoot()));

        Button profileBtn = menuButton("Mon profil");

        Button pluginsBtn = menuButton("Plugins");
        pluginsBtn.setOnAction(e -> root.setCenter(buildPluginsView()));

        VBox spacer = new VBox();
        VBox.setVgrow(spacer, Priority.ALWAYS);

        Button logoutBtn = new Button("Déconnexion");
        logoutBtn.getStyleClass().add("logout-button");
        logoutBtn.setMaxWidth(Double.MAX_VALUE);
        logoutBtn.setOnAction(e -> handleLogout());

        VBox sidebar = new VBox(12, appName, dashboardBtn, incidentsBtn, profileBtn, pluginsBtn, spacer, logoutBtn);
        sidebar.setPadding(new Insets(20));
        sidebar.setPrefWidth(200);
        sidebar.getStyleClass().add("sidebar");
        return sidebar;
    }

    private HBox buildTopBar() {
        String email = AuthService.getInstance().getCurrentUserEmail();
        Label userLabel = new Label(email != null ? email : "Utilisateur");
        userLabel.getStyleClass().add("topbar-user");

        statusLabel.getStyleClass().add("status-offline");

        HBox spacer = new HBox();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        HBox topBar = new HBox(12, spacer, statusLabel, userLabel);
        topBar.setAlignment(Pos.CENTER_RIGHT);
        topBar.setPadding(new Insets(12, 20, 12, 20));
        topBar.getStyleClass().add("topbar");
        return topBar;
    }

    private VBox buildContent() {
        Label welcome = new Label("Bienvenue sur QuartierConnect");
        welcome.getStyleClass().add("content-title");

        Label info = new Label("Les fonctionnalités complètes seront disponibles à l'Étape 3.");
        info.getStyleClass().add("content-subtitle");
        info.setWrapText(true);

        VBox content = new VBox(16, welcome, info);
        content.setPadding(new Insets(30));
        content.setAlignment(Pos.TOP_LEFT);
        return content;
    }

    private Button menuButton(String text) {
        Button btn = new Button(text);
        btn.getStyleClass().add("menu-button");
        btn.setMaxWidth(Double.MAX_VALUE);
        return btn;
    }

    private VBox buildPluginsView() {
        Label title = new Label("Plugins installés");
        title.getStyleClass().add("content-title");

        var pluginList = PluginRegistry.getInstance().getPlugins();
        VBox content = new VBox(12, title);
        content.setPadding(new Insets(30));

        if (pluginList.isEmpty()) {
            Label empty = new Label("Aucun plugin installé. Déposez des fichiers .jar dans le dossier plugins/.");
            empty.setWrapText(true);
            empty.getStyleClass().add("content-subtitle");
            content.getChildren().add(empty);
        } else {
            for (QuartierConnectPlugin plugin : pluginList) {
                Label info = new Label(plugin.getName() + " v" + plugin.getVersion() + "  [" + plugin.getId() + "]");
                info.getStyleClass().add("content-subtitle");
                content.getChildren().add(info);
            }
        }
        return content;
    }

    private void startUpdateChecker() {
        updateService.setOnUpdateAvailable(version -> Platform.runLater(() -> {
            Alert alert = new Alert(Alert.AlertType.INFORMATION);
            alert.setTitle("Mise à jour disponible");
            alert.setHeaderText("Version " + version + " disponible");
            alert.setContentText("Une nouvelle version de QuartierConnect est disponible. Téléchargez-la depuis le portail.");
            alert.showAndWait();
        }));
        updateService.checkInBackground();
    }

    private void startSync() {
        syncService.setOnStatusChange(online -> {
            statusLabel.setText(online ? "● En ligne" : "● Hors ligne");
            statusLabel.getStyleClass().setAll(online ? "status-online" : "status-offline");
        });
        syncService.setOnIncidentsChanged(incidentsView::refresh);
        syncService.start();
    }

    private void handleLogout() {
        syncService.shutdown();
        updateService.shutdown();
        PluginRegistry.getInstance().unregisterAll();
        AuthService.getInstance().clearSession();
        LoginView loginView = new LoginView(stage, openBrowser);
        stage.getScene().setRoot(loginView.getRoot());
        stage.setWidth(420);
        stage.setHeight(500);
        stage.setResizable(false);
    }
}
