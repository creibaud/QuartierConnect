package fr.quartierconnect.desktopapp.plugin;

import fr.quartierconnect.desktopapp.database.IncidentRepository;
import fr.quartierconnect.desktopapp.ui.components.ToastManager;
import javafx.scene.Scene;

/**
 * Fournit aux plugins un accès contrôlé aux services de l'application et à la scène principale.
 * Transmis à {@link PluginRegistry#register(QuartierConnectPlugin, AppContext)}.
 */
public final class AppContext {

    private final Scene scene;
    private final IncidentRepository incidentRepository;
    private final ToastManager toastManager;
    private final PluginEventBus eventBus;

    public AppContext(Scene scene, IncidentRepository incidentRepository,
                      ToastManager toastManager, PluginEventBus eventBus) {
        this.scene = scene;
        this.incidentRepository = incidentRepository;
        this.toastManager = toastManager;
        this.eventBus = eventBus;
    }

    public Scene getScene() {
        return scene;
    }

    public IncidentRepository getIncidentRepository() {
        return incidentRepository;
    }

    public ToastManager getToastManager() {
        return toastManager;
    }

    public PluginEventBus getEventBus() {
        return eventBus;
    }
}
