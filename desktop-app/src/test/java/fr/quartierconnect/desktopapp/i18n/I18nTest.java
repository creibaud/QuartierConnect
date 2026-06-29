package fr.quartierconnect.desktopapp.i18n;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.ListResourceBundle;
import java.util.Locale;
import java.util.Map;
import java.util.ResourceBundle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class I18nTest {

    private static final Locale TEST_LOCALE = Locale.forLanguageTag("xx");

    @AfterEach
    void resetState() {
        I18n.unregisterLanguagePack(TEST_LOCALE);
        I18n.setLocale(Locale.ENGLISH);
    }

    private static ResourceBundle bundleOf(Map<String, String> entries) {
        return new ListResourceBundle() {
            @Override
            protected Object[][] getContents() {
                return entries.entrySet().stream()
                        .map(e -> new Object[]{e.getKey(), e.getValue()})
                        .toArray(Object[][]::new);
            }
        };
    }

    @Test
    void registerLanguagePack_addsLocaleToAvailableLocales() {
        I18n.registerLanguagePack(TEST_LOCALE, bundleOf(Map.of("nav.dashboard", "Tablero")));
        assertTrue(I18n.availableLocales().stream().anyMatch(l -> l.getLanguage().equals("xx")));
    }

    @Test
    void activePack_overridesKey_andFallsBackForMissingKey() {
        I18n.registerLanguagePack(TEST_LOCALE, bundleOf(Map.of("nav.dashboard", "Tablero")));
        I18n.setLocale(TEST_LOCALE);

        assertEquals("Tablero", I18n.get("nav.dashboard"), "Pack value should win");
        assertNotEquals("nav.incidents", I18n.get("nav.incidents"), "Missing key should fall back to core bundle");
    }

    @Test
    void unregisterPack_revertsToDefaultLocale_whenItWasActive() {
        I18n.registerLanguagePack(TEST_LOCALE, bundleOf(Map.of("nav.dashboard", "Tablero")));
        I18n.setLocale(TEST_LOCALE);

        I18n.unregisterLanguagePack(TEST_LOCALE);

        assertEquals(Locale.ENGLISH.getLanguage(), I18n.getLocale().getLanguage());
    }
}
