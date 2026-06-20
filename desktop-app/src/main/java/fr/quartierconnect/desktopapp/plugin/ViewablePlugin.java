package fr.quartierconnect.desktopapp.plugin;

import javafx.scene.Node;

/**
 * Optional extension for plugins that expose a configuration panel.
 * PluginsView will render the panel inline when the user clicks "Configure".
 */
public interface ViewablePlugin {
    Node getPanel();
}
