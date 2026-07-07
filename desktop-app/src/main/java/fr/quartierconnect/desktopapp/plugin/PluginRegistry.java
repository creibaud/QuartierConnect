package fr.quartierconnect.desktopapp.plugin;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.scene.Node;

import java.io.IOException;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.ServiceLoader;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Logger;

/**
 * Central plugin registry. External plugins can be loaded from JAR files
 * via {@link #loadFromJar(Path, AppContext)}.
 */
public class PluginRegistry {

    private static final Logger LOG = Logger.getLogger(PluginRegistry.class.getName());
    private static final PluginRegistry INSTANCE = new PluginRegistry();

    private final List<QuartierConnectPlugin> plugins = new ArrayList<>();
    private final Map<QuartierConnectPlugin, URLClassLoader> classLoaders = new IdentityHashMap<>();
    private final Map<String, Boolean> enabledState = new ConcurrentHashMap<>();

    /** Plugin-injected nodes for the incidents table header. */
    private final ObservableList<Node> incidentSlot = FXCollections.observableArrayList();
    /** Plugin-injected nodes for the top bar. */
    private final ObservableList<Node> topBarSlot = FXCollections.observableArrayList();

    public ObservableList<Node> getIncidentSlot() { return incidentSlot; }
    public ObservableList<Node> getTopBarSlot()   { return topBarSlot; }

    private PluginRegistry() {}

    public static PluginRegistry getInstance() {
        return INSTANCE;
    }

    public void register(QuartierConnectPlugin plugin) {
        plugins.add(plugin);
        LOG.fine("Plugin registered: " + plugin.getId() + " v" + plugin.getVersion());
        try {
            plugin.onLoad();
        } catch (Exception e) {
            LOG.severe("Plugin " + plugin.getId() + " failed to load: " + e.getMessage());
        }
    }

    /** Registers a plugin, injecting the app context before {@code onLoad()}. */
    public void register(QuartierConnectPlugin plugin, AppContext context) {
        plugins.add(plugin);
        LOG.fine("Plugin registered: " + plugin.getId() + " v" + plugin.getVersion());
        try {
            if (plugin instanceof ContextAwarePlugin) {
                ((ContextAwarePlugin) plugin).setContext(context);
            }
            plugin.onLoad();
        } catch (Exception e) {
            LOG.severe("Plugin " + plugin.getId() + " failed to load: " + e.getMessage());
        }
    }

    /** Unloads and removes the plugin with the given id, returning true if it was found. */
    public boolean unregister(String pluginId) {
        QuartierConnectPlugin target = plugins.stream()
                .filter(p -> pluginId.equals(p.getId()))
                .findFirst()
                .orElse(null);
        if (target == null) return false;
        try {
            target.onUnload();
            LOG.info("Plugin unloaded: " + target.getId());
        } catch (Exception e) {
            LOG.warning("Plugin " + target.getId() + " failed to unload cleanly: " + e.getMessage());
        }
        plugins.remove(target);
        URLClassLoader loader = classLoaders.remove(target);
        if (loader != null) {
            try {
                loader.close();
            } catch (IOException e) {
                LOG.warning("Failed to close classloader for plugin " + pluginId + ": " + e.getMessage());
            }
        }
        return true;
    }

    /**
     * Loads all plugins from a JAR via {@link ServiceLoader}. The JAR must list its
     * implementations in {@code META-INF/services/fr.quartierconnect.desktopapp.plugin.QuartierConnectPlugin}.
     */
    public void loadFromJar(Path jar, AppContext context) {
        if (!Files.isRegularFile(jar)) {
            LOG.warning("Plugin JAR not found: " + jar);
            return;
        }
        URLClassLoader loader = null;
        try {
            loader = new URLClassLoader(
                    new java.net.URL[]{jar.toUri().toURL()},
                    getClass().getClassLoader()
            );
            ServiceLoader<QuartierConnectPlugin> serviceLoader =
                    ServiceLoader.load(QuartierConnectPlugin.class, loader);
            int count = 0;
            for (QuartierConnectPlugin plugin : serviceLoader) {
                register(plugin, context);
                classLoaders.put(plugin, loader);
                count++;
            }
            if (count == 0) {
                loader.close();
                LOG.warning("No plugins found in JAR: " + jar.getFileName());
            }
        } catch (IOException e) {
            LOG.severe("Failed to load plugin JAR " + jar + ": " + e.getMessage());
            if (loader != null) {
                try { loader.close(); } catch (IOException ex) { /* best effort */ }
            }
        }
    }

    public void loadFromDirectory(Path directory, AppContext context) {
        if (!Files.isDirectory(directory)) {
            LOG.fine("Plugins directory does not exist, skipping: " + directory);
            return;
        }
        try (var stream = Files.list(directory)) {
            stream.filter(p -> p.toString().endsWith(".jar"))
                  .sorted()
                  .forEach(jar -> loadFromJar(jar, context));
        } catch (IOException e) {
            LOG.severe("Failed to scan plugins directory " + directory + ": " + e.getMessage());
        }
    }

    public void unregisterAll() {
        for (QuartierConnectPlugin plugin : plugins) {
            try {
                plugin.onUnload();
                LOG.fine("Plugin unloaded: " + plugin.getId());
            } catch (Exception e) {
                LOG.warning("Plugin " + plugin.getId() + " failed to unload cleanly: " + e.getMessage());
            }
        }
        plugins.clear();
        for (URLClassLoader loader : classLoaders.values()) {
            try {
                loader.close();
            } catch (IOException e) {
                LOG.warning("Failed to close plugin classloader: " + e.getMessage());
            }
        }
        classLoaders.clear();
    }

    public List<QuartierConnectPlugin> getPlugins() {
        return Collections.unmodifiableList(plugins);
    }

    public boolean isEnabled(String pluginId) {
        return enabledState.getOrDefault(pluginId, true);
    }

    public void enable(String pluginId) {
        enabledState.put(pluginId, true);
        plugins.stream()
                .filter(p -> pluginId.equals(p.getId()))
                .findFirst()
                .ifPresent(p -> {
                    try {
                        p.onLoad();
                    } catch (Exception e) {
                        enabledState.put(pluginId, false);
                        LOG.severe("Plugin " + pluginId + " failed to enable: " + e.getMessage());
                    }
                });
    }

    public void disable(String pluginId) {
        enabledState.put(pluginId, false);
        plugins.stream()
                .filter(p -> pluginId.equals(p.getId()))
                .findFirst()
                .ifPresent(p -> {
                    try {
                        p.onUnload();
                    } catch (Exception e) {
                        LOG.warning("Plugin " + pluginId + " failed to disable cleanly: " + e.getMessage());
                    }
                });
    }

    /** Optional interface for plugins that need the app context. */
    public interface ContextAwarePlugin {
        void setContext(AppContext context);
    }
}
