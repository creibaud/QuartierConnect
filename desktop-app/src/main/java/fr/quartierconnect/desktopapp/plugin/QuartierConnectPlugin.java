package fr.quartierconnect.desktopapp.plugin;

/**
 * Plugin interface for QuartierConnect Desktop. Implement it and register
 * the plugin through {@link PluginRegistry}.
 */
public interface QuartierConnectPlugin {

    /** Unique plugin id, e.g. "fr.quartierconnect.plugin.weather". */
    String getId();

    /** Human-readable name shown in the plugin manager. */
    String getName();

    /** Version string (semver recommended). */
    String getVersion();

    /** Called once when the plugin is loaded. */
    void onLoad();

    /** Called once when the plugin is unloaded or the app shuts down; release resources here. */
    void onUnload();

    /** Short description shown in the plugin manager. */
    default String getDescription() { return ""; }
}
