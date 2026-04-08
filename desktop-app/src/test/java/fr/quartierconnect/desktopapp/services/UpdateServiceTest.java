package fr.quartierconnect.desktopapp.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.*;

class UpdateServiceTest {

    private UpdateService updateService;

    @BeforeEach
    void setUp() {
        updateService = new UpdateService();
    }

    @Test
    void parseVersion_returnsNull_whenVersionFieldMissing() throws Exception {
        Method m = UpdateService.class.getDeclaredMethod("parseVersion", String.class);
        m.setAccessible(true);
        String result = (String) m.invoke(updateService, "{\"status\":\"ok\"}");
        assertNull(result, "Should return null when 'version' key is absent");
    }

    @Test
    void parseVersion_returnsVersion_whenPresent() throws Exception {
        Method m = UpdateService.class.getDeclaredMethod("parseVersion", String.class);
        m.setAccessible(true);
        String result = (String) m.invoke(updateService, "{\"status\":\"ok\",\"version\":\"1.2.3\"}");
        assertEquals("1.2.3", result);
    }

    @Test
    void parseVersion_returnsNull_forMalformedJson() throws Exception {
        Method m = UpdateService.class.getDeclaredMethod("parseVersion", String.class);
        m.setAccessible(true);
        String result = (String) m.invoke(updateService, "not-json");
        assertNull(result, "Should return null on parse error");
    }

    @Test
    void isNewer_returnsTrue_whenCandidateIsHigher() throws Exception {
        Method m = UpdateService.class.getDeclaredMethod("isNewer", String.class, String.class);
        m.setAccessible(true);
        assertTrue((boolean) m.invoke(updateService, "2.0.0", "1.9.9"));
        assertTrue((boolean) m.invoke(updateService, "1.1.0", "1.0.9"));
        assertTrue((boolean) m.invoke(updateService, "1.0.1", "1.0.0"));
    }

    @Test
    void isNewer_returnsFalse_whenCandidateIsLowerOrEqual() throws Exception {
        Method m = UpdateService.class.getDeclaredMethod("isNewer", String.class, String.class);
        m.setAccessible(true);
        assertFalse((boolean) m.invoke(updateService, "1.0.0", "1.0.0"), "Equal versions: not newer");
        assertFalse((boolean) m.invoke(updateService, "0.9.9", "1.0.0"), "Lower version: not newer");
        assertFalse((boolean) m.invoke(updateService, "1.0.0", "2.0.0"), "Much lower: not newer");
    }
}
