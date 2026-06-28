package fr.quartierconnect.desktopapp.plugin;

import java.util.Locale;
import java.util.ResourceBundle;

/**
 * A plugin that contributes a new UI language at runtime. The provided bundle is
 * merged on top of the built-in strings, so a pack only needs to translate the
 * keys it wants; untranslated keys fall back to English.
 *
 * @see AbstractLanguagePackPlugin for a ready-made base class
 */
public interface LanguagePackPlugin extends QuartierConnectPlugin {

    /** The language this pack provides. */
    Locale locale();

    /** The translated strings, keyed exactly like {@code messages_*.properties}. */
    ResourceBundle bundle();
}
