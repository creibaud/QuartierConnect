package fr.quartierconnect.desktopapp.plugin;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ThemePluginTest {

    @Test
    void sanitizeThemeId_keepsVoisinage() {
        assertEquals(ThemePlugin.THEME_VOISINAGE, ThemePlugin.sanitizeThemeId(ThemePlugin.THEME_VOISINAGE));
    }

    @Test
    void sanitizeThemeId_keepsPrimerDark() {
        assertEquals(ThemePlugin.THEME_DARK, ThemePlugin.sanitizeThemeId(ThemePlugin.THEME_DARK));
    }

    @Test
    void sanitizeThemeId_mapsLegacyIdToDefault() {
        assertEquals(ThemePlugin.DEFAULT_THEME_ID, ThemePlugin.sanitizeThemeId("nord-dark"));
    }

    @Test
    void sanitizeThemeId_mapsNullToDefault() {
        assertEquals(ThemePlugin.DEFAULT_THEME_ID, ThemePlugin.sanitizeThemeId(null));
    }
}
