package fr.quartierconnect.desktopapp.plugin;

import java.util.Locale;
import java.util.ResourceBundle;

/**
 * Plugin qui ajoute une nouvelle langue d'interface à l'exécution. Le bundle fourni
 * est fusionné par-dessus les chaînes intégrées : un pack n'a donc besoin de traduire
 * que les clés qu'il souhaite ; les clés non traduites retombent sur l'anglais.
 *
 * @see AbstractLanguagePackPlugin pour une classe de base prête à l'emploi
 */
public interface LanguagePackPlugin extends QuartierConnectPlugin {

    /** La langue fournie par ce pack. */
    Locale locale();

    /** Les chaînes traduites, avec les mêmes clés que {@code messages_*.properties}. */
    ResourceBundle bundle();
}
