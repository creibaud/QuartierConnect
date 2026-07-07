package fr.quartierconnect.desktopapp.plugin;

import javafx.scene.Node;

/** Optional extension for plugins exposing a configuration panel, shown inline by PluginsView. */
public interface ViewablePlugin {
    Node getPanel();
}
