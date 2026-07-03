package fr.quartierconnect.desktopapp.plugin;

/**
 * Interface de plugin pour QuartierConnect Desktop.
 * Un plugin peut apporter des vues, des workers de synchronisation et des entrées de menu.
 *
 * Implémentez cette interface et enregistrez le plugin via {@link PluginRegistry}.
 */
public interface QuartierConnectPlugin {

    /**
     * Identifiant unique du plugin (par exemple « fr.quartierconnect.plugin.weather »).
     */
    String getId();

    /**
     * Nom lisible du plugin (affiché dans le gestionnaire de plugins).
     */
    String getName();

    /**
     * Chaîne de version du plugin (semver recommandé).
     */
    String getVersion();

    /**
     * Appelée une seule fois lors du chargement du plugin.
     * Effectuez ici l'initialisation (enregistrement de services, planification de tâches).
     */
    void onLoad();

    /**
     * Appelée une seule fois lors du déchargement du plugin ou à la fermeture de l'application.
     * Libérez ici les ressources (annulation des tâches planifiées, fermeture des connexions).
     */
    void onUnload();

    /**
     * Brève description de ce que fait le plugin (affichée dans le gestionnaire de plugins).
     */
    default String getDescription() { return ""; }
}
