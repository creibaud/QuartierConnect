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
 * Registre central des plugins QuartierConnect.
 * Les plugins sont enregistrés au démarrage et déchargés à l'arrêt.
 * Des plugins externes peuvent être chargés depuis des fichiers JAR via {@link #loadFromJar(Path, AppContext)}.
 */
public class PluginRegistry {

    private static final Logger LOG = Logger.getLogger(PluginRegistry.class.getName());
    private static final PluginRegistry INSTANCE = new PluginRegistry();

    private final List<QuartierConnectPlugin> plugins = new ArrayList<>();
    private final Map<QuartierConnectPlugin, URLClassLoader> classLoaders = new IdentityHashMap<>();
    private final Map<String, Boolean> enabledState = new ConcurrentHashMap<>();

    /** Emplacement UI — boutons injectés par les plugins dans l'en-tête du tableau des incidents. */
    private final ObservableList<Node> incidentSlot = FXCollections.observableArrayList();
    /** Emplacement UI — boutons/icônes injectés par les plugins dans la barre supérieure. */
    private final ObservableList<Node> topBarSlot = FXCollections.observableArrayList();

    public ObservableList<Node> getIncidentSlot() { return incidentSlot; }
    public ObservableList<Node> getTopBarSlot()   { return topBarSlot; }

    private PluginRegistry() {}

    public static PluginRegistry getInstance() {
        return INSTANCE;
    }

    /**
     * Enregistre un plugin et appelle {@link QuartierConnectPlugin#onLoad()}.
     */
    public void register(QuartierConnectPlugin plugin) {
        plugins.add(plugin);
        LOG.fine("Plugin registered: " + plugin.getId() + " v" + plugin.getVersion());
        try {
            plugin.onLoad();
        } catch (Exception e) {
            LOG.severe("Plugin " + plugin.getId() + " failed to load: " + e.getMessage());
        }
    }

    /**
     * Enregistre un plugin avec accès au contexte applicatif.
     * Appelle {@link QuartierConnectPlugin#onLoad()} après avoir défini le contexte.
     */
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

    /**
     * Décharge et retire un plugin identifié par son id.
     *
     * @return true si le plugin a été trouvé et retiré
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
     * Charge tous les plugins d'un même fichier JAR via {@link ServiceLoader}.
     * Le JAR doit déclarer ses implémentations dans {@code META-INF/services/fr.quartierconnect.desktopapp.plugin.QuartierConnectPlugin}.
     *
     * @param jar     chemin du fichier JAR
     * @param context contexte applicatif transmis à chaque plugin chargé
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
                try { loader.close(); } catch (IOException ex) { /* au mieux */ }
            }
        }
    }

    /**
     * Charge tous les plugins de chaque fichier JAR présent dans un répertoire.
     *
     * @param directory chemin du répertoire des plugins
     * @param context   contexte applicatif transmis à chaque plugin chargé
     */
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

    /**
     * Interface facultative pour les plugins qui ont besoin du contexte applicatif.
     */
    public interface ContextAwarePlugin {
        void setContext(AppContext context);
    }
}
