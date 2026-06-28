package fr.quartierconnect.desktopapp.views;

import atlantafx.base.controls.ModalPane;
import fr.quartierconnect.desktopapp.database.IncidentRepository;
import fr.quartierconnect.desktopapp.i18n.I18n;
import fr.quartierconnect.desktopapp.plugin.AppContext;
import fr.quartierconnect.desktopapp.plugin.CompactModePlugin;
import fr.quartierconnect.desktopapp.plugin.ExportPlugin;
import fr.quartierconnect.desktopapp.plugin.NotificationPlugin;
import fr.quartierconnect.desktopapp.plugin.OfflineModePlugin;
import fr.quartierconnect.desktopapp.plugin.PluginEventBus;
import fr.quartierconnect.desktopapp.plugin.PluginRegistry;
import fr.quartierconnect.desktopapp.plugin.SpanishLanguagePackPlugin;
import fr.quartierconnect.desktopapp.plugin.ThemePlugin;
import fr.quartierconnect.desktopapp.services.ApiService;
import fr.quartierconnect.desktopapp.services.AuthService;
import fr.quartierconnect.desktopapp.services.SyncService;
import fr.quartierconnect.desktopapp.ui.components.AppModal;
import fr.quartierconnect.desktopapp.ui.components.ToastManager;
import fr.quartierconnect.desktopapp.ui.layout.AppSidebar;
import fr.quartierconnect.desktopapp.ui.layout.AppTopBar;
import fr.quartierconnect.desktopapp.ui.layout.PageLayout;
import javafx.application.Platform;
import javafx.scene.Parent;
import javafx.scene.layout.StackPane;
import javafx.stage.Stage;
import org.kordamp.ikonli.fontawesome5.FontAwesomeSolid;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.function.Consumer;

public class MainView {

    private final Stage            stage;
    private final Consumer<String> openBrowser;
    private final AppSidebar       sidebar;
    private final AppTopBar        topBar;
    private final PageLayout       layout;
    private final ModalPane        modalPane;
    private final AppModal         appModal;
    private final ToastManager     toast;
    private final SyncService      syncService;
    private final StackPane        root;

    private AppSidebar.NavItem dashBtn;
    private AppSidebar.NavItem incidentsBtn;
    private AppSidebar.NavItem profileBtn;
    private AppSidebar.NavItem pluginsBtn;

    public MainView(Stage stage, Consumer<String> openBrowser) {
        this.stage       = stage;
        this.openBrowser = openBrowser;

        sidebar     = new AppSidebar();
        topBar      = new AppTopBar(extractInitials(AuthService.getInstance().getCurrentUserEmail()));
        layout      = new PageLayout(sidebar, topBar);
        modalPane   = new ModalPane();
        appModal    = new AppModal(modalPane);
        root        = new StackPane(layout, modalPane);
        toast       = new ToastManager(root);
        syncService = new SyncService();

        PluginEventBus eventBus = new PluginEventBus();
        syncService.setEventBus(eventBus);

        AppContext appContext = new AppContext(
                null,
                AuthService.getInstance(),
                stage.getScene(),
                new IncidentRepository(),
                syncService,
                toast,
                eventBus
        );

        PluginRegistry registry = PluginRegistry.getInstance();
        registry.unregisterAll();
        registry.register(new ThemePlugin(), appContext);
        registry.register(new CompactModePlugin(), appContext);
        registry.register(new ExportPlugin(), appContext);
        registry.register(new NotificationPlugin(), appContext);
        registry.register(new OfflineModePlugin(), appContext);
        registry.register(new SpanishLanguagePackPlugin(), appContext);

        Path pluginsDir = Paths.get("plugins");
        registry.loadFromDirectory(pluginsDir, appContext);

        syncService.setOnStatusChange(online -> {
            if (online) eventBus.publish(PluginEventBus.Event.ONLINE_STATUS_CHANGED, true);
        });
        syncService.start();
        tryBackgroundReconnect();

        buildNavigation();
        navigate(dashBtn, "dashboard");
    }

    private void tryBackgroundReconnect() {
        if (AuthService.getInstance().getAccessToken() != null
                && !AuthService.getInstance().isTokenExpired(AuthService.getInstance().getAccessToken())) {
            return;
        }
        new Thread(() -> {
            if (!ApiService.isReachable()) return;
            boolean refreshed = AuthService.getInstance().refreshAccessToken();
            if (refreshed) {
                Platform.runLater(() -> toast.showSuccess(I18n.get("reconnect.success")));
                syncService.syncNow();
            }
        }, "background-reconnect").start();
    }

    public Parent getRoot() {
        return root;
    }

    // ── Navigation ──────────────────────────────────────────────────────────

    private void buildNavigation() {
        dashBtn      = sidebar.addNavItem(FontAwesomeSolid.HOME,           I18n.get("nav.dashboard"));
        incidentsBtn = sidebar.addNavItem(FontAwesomeSolid.CLIPBOARD_LIST, I18n.get("nav.incidents"));

        sidebar.addSeparator();

        profileBtn = sidebar.addNavItem(FontAwesomeSolid.USER, I18n.get("nav.profile"));
        pluginsBtn = sidebar.addNavItem(FontAwesomeSolid.PLUG, I18n.get("nav.plugins"));

        sidebar.addSpacer();

        AppSidebar.NavItem logoutBtn = sidebar.addLogoutItem(FontAwesomeSolid.POWER_OFF, I18n.get("nav.logout"));

        dashBtn.setAction(()      -> navigate(dashBtn,      "dashboard"));
        incidentsBtn.setAction(() -> navigate(incidentsBtn, "incidents"));
        profileBtn.setAction(()   -> navigate(profileBtn,   "profile"));
        pluginsBtn.setAction(()   -> navigate(pluginsBtn,   "plugins"));
        logoutBtn.setAction(()    -> logout());
    }

    private void navigate(AppSidebar.NavItem item, String route) {
        sidebar.setActive(item);

        switch (route) {
            case "dashboard" -> {
                topBar.setBreadcrumb(I18n.get("nav.dashboard"));
                layout.setContent(new DashboardView(this::handleRoute, syncService, toast).getRoot());
            }
            case "incidents" -> {
                topBar.setBreadcrumb(I18n.get("nav.incidents"));
                layout.setContent(new IncidentsView(appModal, toast, syncService).getRoot());
            }
            case "profile" -> {
                topBar.setBreadcrumb(I18n.get("nav.profile"));
                layout.setContent(new ProfileView(this::logout, syncService).getRoot());
            }
            case "plugins" -> {
                topBar.setBreadcrumb(I18n.get("nav.plugins"));
                layout.setContent(new PluginsView(appModal).getRoot());
            }
        }
    }

    private void handleRoute(String route) {
        switch (route) {
            case "incidents", "create_incident" -> navigate(incidentsBtn, "incidents");
            case "plugins"                      -> navigate(pluginsBtn,   "plugins");
        }
    }

    // ── Logout ──────────────────────────────────────────────────────────────

    private void logout() {
        topBar.shutdown();
        syncService.shutdown();
        PluginRegistry.getInstance().unregisterAll();
        AuthService.getInstance().clearSession();
        Platform.runLater(() -> {
            LoginView loginView = new LoginView(stage, openBrowser);
            stage.getScene().setRoot(loginView.getRoot());
            stage.setResizable(false);
            stage.setWidth(420);
            stage.setHeight(560);
        });
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private static String extractInitials(String email) {
        if (email == null || email.isBlank()) return "?";
        String local = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        String[] parts = local.split("[._-]");
        if (parts.length >= 2) {
            return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
        }
        return local.substring(0, Math.min(2, local.length())).toUpperCase();
    }
}
