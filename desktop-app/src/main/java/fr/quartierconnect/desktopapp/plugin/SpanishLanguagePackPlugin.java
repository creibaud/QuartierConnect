package fr.quartierconnect.desktopapp.plugin;

import fr.quartierconnect.desktopapp.i18n.I18n;
import java.util.Locale;
import java.util.ResourceBundle;

/**
 * Built-in example language pack — adds Spanish, demonstrating that a plugin can
 * extend the app's languages. Untranslated keys fall back to English.
 */
public class SpanishLanguagePackPlugin extends AbstractLanguagePackPlugin {

    private static final Locale SPANISH = Locale.forLanguageTag("es");

    @Override public String getId()          { return "fr.quartierconnect.plugin.lang.es"; }
    @Override public String getName()        { return I18n.get("plugin.language.es.name"); }
    @Override public String getVersion()     { return "1.0.0"; }
    @Override public String getDescription() { return I18n.get("plugin.language.es.description"); }

    @Override public Locale locale() { return SPANISH; }

    @Override
    public ResourceBundle bundle() {
        return ResourceBundle.getBundle("i18n.messages", SPANISH);
    }
}
