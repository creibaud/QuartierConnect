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
 * Central access point for localized UI strings.
 *
 * <p>Built-in strings live in {@code i18n/messages_<lang>.properties} resource
 * bundles (English, French). Plugins can contribute additional languages at
 * runtime by registering a {@link ResourceBundle} via
 * {@link #registerLanguagePack(Locale, ResourceBundle)}; the pack's strings take
 * precedence and any missing key falls back to the built-in English bundle.</p>
 *
 * <p>The active language is persisted across restarts via {@link Preferences};
 * English is the default. Changing the locale at runtime does not re-bind
 * already-built views — callers should prompt the user to restart.</p>
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

    /** Add a plugin-provided language. Its strings override the built-in bundle. */
    public static synchronized void registerLanguagePack(Locale locale, ResourceBundle packBundle) {
        languagePacks.put(locale.getLanguage(), packBundle);
        if (currentLocale.getLanguage().equals(locale.getLanguage())) {
            bundle = loadBundle(currentLocale);
        }
    }

    /** Remove a plugin language; reverts to the default locale if it was active. */
    public static synchronized void unregisterLanguagePack(Locale locale) {
        languagePacks.remove(locale.getLanguage());
        if (currentLocale.getLanguage().equals(locale.getLanguage())) {
            setLocale(DEFAULT_LOCALE);
        }
    }

    /** Built-in languages plus every registered plugin language. */
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
                // fall back to the built-in bundle below
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
