package fr.quartierconnect.desktopapp.i18n;

import java.text.MessageFormat;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.MissingResourceException;
import java.util.ResourceBundle;
import java.util.prefs.Preferences;

/**
 * Point d'accès central aux chaînes d'interface localisées.
 *
 * <p>Les chaînes intégrées résident dans les bundles de ressources
 * {@code i18n/messages_<lang>.properties} (anglais, français). Les plugins peuvent
 * ajouter des langues supplémentaires à l'exécution en enregistrant un {@link ResourceBundle}
 * via {@link #registerLanguagePack(Locale, ResourceBundle)} ; les chaînes du pack sont
 * prioritaires et toute clé manquante se rabat sur le bundle anglais intégré.</p>
 *
 * <p>La langue active est persistée d'un redémarrage à l'autre via {@link Preferences} ;
 * l'anglais est la langue par défaut. Changer de locale à l'exécution ne réassocie pas
 * les vues déjà construites — les appelants devraient inviter l'utilisateur à redémarrer.</p>
 */
public final class I18n {

    private static final String BUNDLE_BASE_NAME = "i18n.messages";
    private static final String PREF_LOCALE_KEY = "locale";
    private static final Locale DEFAULT_LOCALE = Locale.ENGLISH;
    private static final List<Locale> BUILT_IN_LOCALES = List.of(Locale.ENGLISH, Locale.FRENCH);

    private static final Preferences PREFERENCES = Preferences.userNodeForPackage(I18n.class);
    private static final Map<String, ResourceBundle> languagePacks = new LinkedHashMap<>();

    private static Locale currentLocale = loadSavedLocale();
    private static ResourceBundle bundle = loadBundle(currentLocale);

    private I18n() {}

    public static String get(String key, Object... args) {
        String pattern = lookup(key);
        if (args == null || args.length == 0) {
            return pattern;
        }
        return MessageFormat.format(pattern, args);
    }

    public static Locale getLocale() {
        return currentLocale;
    }

    public static void setLocale(Locale locale) {
        currentLocale = locale;
        bundle = loadBundle(locale);
        PREFERENCES.put(PREF_LOCALE_KEY, locale.getLanguage());
    }

    /** Ajoute une langue fournie par un plugin. Ses chaînes surchargent le bundle intégré. */
    public static synchronized void registerLanguagePack(Locale locale, ResourceBundle packBundle) {
        languagePacks.put(locale.getLanguage(), packBundle);
        if (currentLocale.getLanguage().equals(locale.getLanguage())) {
            bundle = loadBundle(currentLocale);
        }
    }

    /** Retire une langue de plugin ; revient à la locale par défaut si elle était active. */
    public static synchronized void unregisterLanguagePack(Locale locale) {
        languagePacks.remove(locale.getLanguage());
        if (currentLocale.getLanguage().equals(locale.getLanguage())) {
            setLocale(DEFAULT_LOCALE);
        }
    }

    /** Langues intégrées plus chaque langue de plugin enregistrée. */
    public static List<Locale> availableLocales() {
        List<Locale> locales = new ArrayList<>(BUILT_IN_LOCALES);
        for (String language : languagePacks.keySet()) {
            if (locales.stream().noneMatch(l -> l.getLanguage().equals(language))) {
                locales.add(Locale.forLanguageTag(language));
            }
        }
        return locales;
    }

    private static String lookup(String key) {
        ResourceBundle pack = languagePacks.get(currentLocale.getLanguage());
        if (pack != null) {
            try {
                return pack.getString(key);
            } catch (MissingResourceException ignored) {
                // repli sur le bundle intégré ci-dessous
            }
        }
        try {
            return bundle.getString(key);
        } catch (MissingResourceException e) {
            return key;
        }
    }

    private static Locale loadSavedLocale() {
        String language = PREFERENCES.get(PREF_LOCALE_KEY, DEFAULT_LOCALE.getLanguage());
        return Locale.forLanguageTag(language);
    }

    private static ResourceBundle loadBundle(Locale locale) {
        boolean builtIn = BUILT_IN_LOCALES.stream().anyMatch(l -> l.getLanguage().equals(locale.getLanguage()));
        return ResourceBundle.getBundle(BUNDLE_BASE_NAME, builtIn ? locale : DEFAULT_LOCALE);
    }
}
