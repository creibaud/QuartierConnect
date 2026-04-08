package fr.quartierconnect.desktopapp.plugin;

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
import java.util.logging.Logger;

/**
 * Central registry for QuartierConnect plugins.
 * Plugins are registered at startup and unloaded on shutdown.
 * External plugins can be loaded from JAR files via {@link #loadFromJar(Path, AppContext)}.
 */
public class PluginRegistry {

    private static final Logger LOG = Logger.getLogger(PluginRegistry.class.getName());
    private static final PluginRegistry INSTANCE = new PluginRegistry();

    private final List<QuartierConnectPlugin> plugins = new ArrayList<>();
    private final Map<QuartierConnectPlugin, URLClassLoader> classLoaders = new IdentityHashMap<>();

    private PluginRegistry() {}

    public static PluginRegistry getInstance() {
        return INSTANCE;
    }

    /**
     * Register a plugin and call {@link QuartierConnectPlugin#onLoad()}.
     */
    public void register(QuartierConnectPlugin plugin) {
        plugins.add(plugin);
        LOG.info("Plugin registered: " + plugin.getId() + " v" + plugin.getVersion());
        try {
            plugin.onLoad();
        } catch (Exception e) {
            LOG.severe("Plugin " + plugin.getId() + " failed to load: " + e.getMessage());
        }
    }

    /**
     * Register a plugin with application context access.
     * Calls {@link QuartierConnectPlugin#onLoad()} after setting context.
     */
    public void register(QuartierConnectPlugin plugin, AppContext context) {
        plugins.add(plugin);
        LOG.info("Plugin registered: " + plugin.getId() + " v" + plugin.getVersion());
        try {
            if (plugin instanceof ContextAwarePlugin) {
                ((ContextAwarePlugin) plugin).setContext(context);
            }
            plugin.onLoad();
        } catch (Exception e) {
            LOG.severe("Plugin " + plugin.getId() + " failed to load: " + e.getMessage());
        }
    }

    /**
     * Unload and remove a single plugin by its id.
     *
     * @return true if the plugin was found and removed
     */
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
     * Load all plugins from a single JAR file using {@link ServiceLoader}.
     * The JAR must declare implementations via {@code META-INF/services/fr.quartierconnect.desktopapp.plugin.QuartierConnectPlugin}.
     *
     * @param jar     path to the JAR file
     * @param context application context passed to each loaded plugin
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
                try { loader.close(); } catch (IOException ex) { /* best-effort */ }
            }
        }
    }

    /**
     * Load all plugins from every JAR file in a directory.
     *
     * @param directory path to the plugins directory
     * @param context   application context passed to each loaded plugin
     */
    public void loadFromDirectory(Path directory, AppContext context) {
        if (!Files.isDirectory(directory)) {
            LOG.info("Plugins directory does not exist, skipping: " + directory);
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
                LOG.info("Plugin unloaded: " + plugin.getId());
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

    /**
     * Optional interface for plugins that need application context.
     */
    public interface ContextAwarePlugin {
        void setContext(AppContext context);
    }
}
