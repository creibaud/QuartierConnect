package fr.quartierconnect.desktopapp.plugin;

import java.util.Locale;
import java.util.ResourceBundle;

/**
 * Plugin adding a UI language at runtime. The bundle is merged over the built-in
 * strings; untranslated keys fall back to English.
 *
 * @see AbstractLanguagePackPlugin
 */
public interface LanguagePackPlugin extends QuartierConnectPlugin {

    Locale locale();

    /** Translated strings, keyed like {@code messages_*.properties}. */
    ResourceBundle bundle();
}
