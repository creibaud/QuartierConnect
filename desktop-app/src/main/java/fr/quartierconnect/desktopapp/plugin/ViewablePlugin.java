package fr.quartierconnect.desktopapp.plugin;

import javafx.scene.Node;

/**
 * Extension facultative pour les plugins qui exposent un panneau de configuration.
 * PluginsView affiche le panneau en ligne lorsque l'utilisateur clique sur « Configurer ».
 */
public interface ViewablePlugin {
    Node getPanel();
}
