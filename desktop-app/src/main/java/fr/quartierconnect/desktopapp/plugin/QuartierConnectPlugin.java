package fr.quartierconnect.desktopapp.plugin;

/**
 * Plugin interface for QuartierConnect Desktop.
 * A plugin can contribute views, sync workers, and menu items.
 *
 * Implement this interface and register via {@link PluginRegistry}.
 */
public interface QuartierConnectPlugin {

    /**
     * Unique plugin identifier (e.g. "fr.quartierconnect.plugin.weather").
     */
    String getId();

    /**
     * Human-readable plugin name (shown in the plugin manager).
     */
    String getName();

    /**
     * Plugin version string (semver recommended).
     */
    String getVersion();

    /**
     * Called once when the plugin is loaded.
     * Perform initialisation here (e.g. register services, schedule tasks).
     */
    void onLoad();

    /**
     * Called once when the plugin is unloaded or the application exits.
     * Clean up resources here (e.g. cancel scheduled tasks, close connections).
     */
    void onUnload();
}
