package fr.quartierconnect.desktopapp.plugin;

import fr.quartierconnect.desktopapp.database.IncidentRepository;
import fr.quartierconnect.desktopapp.services.ApiService;
import fr.quartierconnect.desktopapp.services.AuthService;
import fr.quartierconnect.desktopapp.services.SyncService;
import fr.quartierconnect.desktopapp.ui.components.ToastManager;
import javafx.scene.Scene;

/**
 * Provides plugins with controlled access to application services and the primary scene.
 * Passed to {@link PluginRegistry#register(QuartierConnectPlugin, AppContext)}.
 */
public final class AppContext {

    private final ApiService apiService;
    private final AuthService authService;
    private final Scene scene;
    private final IncidentRepository incidentRepository;
    private final SyncService syncService;
    private final ToastManager toastManager;
    private final PluginEventBus eventBus;

    public AppContext(ApiService apiService, AuthService authService, Scene scene,
                      IncidentRepository incidentRepository, SyncService syncService,
                      ToastManager toastManager, PluginEventBus eventBus) {
        this.apiService = apiService;
        this.authService = authService;
        this.scene = scene;
        this.incidentRepository = incidentRepository;
        this.syncService = syncService;
        this.toastManager = toastManager;
        this.eventBus = eventBus;
    }

    public ApiService getApiService() {
        return apiService;
    }

    public AuthService getAuthService() {
        return authService;
    }

    public Scene getScene() {
        return scene;
    }

    public IncidentRepository getIncidentRepository() {
        return incidentRepository;
    }

    public SyncService getSyncService() {
        return syncService;
    }

    public ToastManager getToastManager() {
        return toastManager;
    }

    public PluginEventBus getEventBus() {
        return eventBus;
    }
}
