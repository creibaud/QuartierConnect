package fr.quartierconnect.desktopapp.i18n;

import java.text.MessageFormat;
import java.util.Locale;
import java.util.MissingResourceException;
import java.util.ResourceBundle;
import java.util.prefs.Preferences;

/**
 * Central access point for localized UI strings.
 *
 * <p>Strings live in {@code i18n/messages_<lang>.properties} resource bundles.
 * The active language is persisted across restarts via {@link Preferences};
 * English is the default. Changing the locale at runtime does not re-bind
 * already-built views — callers should prompt the user to restart.</p>
 */
public final class I18n {

    private static final String BUNDLE_BASE_NAME = "i18n.messages";
    private static final String PREF_LOCALE_KEY = "locale";
    private static final Locale DEFAULT_LOCALE = Locale.ENGLISH;

    private static final Preferences PREFERENCES = Preferences.userNodeForPackage(I18n.class);

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

    private static String lookup(String key) {
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
        return ResourceBundle.getBundle(BUNDLE_BASE_NAME, locale);
    }
}
