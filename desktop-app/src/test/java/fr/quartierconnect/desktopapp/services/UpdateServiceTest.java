package fr.quartierconnect.desktopapp.services;

import fr.quartierconnect.desktopapp.util.HostOs;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

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

    @Test
    void parseAssets_extractsNameAndDownloadUrl() throws Exception {
        String json = """
            {"assets":[
              {"name":"quartierconnect_1.0.0_amd64.deb","browser_download_url":"https://x/deb"},
              {"name":"QuartierConnect-1.0.0.msi","browser_download_url":"https://x/msi"}
            ]}""";
        List<UpdateService.ReleaseAsset> assets = UpdateService.parseAssets(json);
        assertEquals(2, assets.size());
        assertEquals("quartierconnect_1.0.0_amd64.deb", assets.get(0).name());
        assertEquals("https://x/msi", assets.get(1).url());
    }

    @Test
    void selectInstaller_picksAssetMatchingPlatformExtension() {
        List<UpdateService.ReleaseAsset> assets = List.of(
                new UpdateService.ReleaseAsset("quartierconnect-desktop.jar", "https://x/jar"),
                new UpdateService.ReleaseAsset("quartierconnect_1.0.0_amd64.deb", "https://x/deb"),
                new UpdateService.ReleaseAsset("QuartierConnect-1.0.0.dmg", "https://x/dmg"));

        assertEquals("https://x/deb", UpdateService.selectInstaller(assets, HostOs.LINUX).orElseThrow().url());
        assertEquals("https://x/dmg", UpdateService.selectInstaller(assets, HostOs.MAC).orElseThrow().url());
        assertEquals(Optional.empty(), UpdateService.selectInstaller(assets, HostOs.WINDOWS));
    }

    @Test
    void installCommand_isPlatformSpecific() {
        Path file = Path.of("/tmp/app.deb");
        assertEquals(List.of("pkexec", "apt-get", "install", "-y", file.toString()),
                UpdateService.installCommand(HostOs.LINUX, file));
        assertEquals("msiexec", UpdateService.installCommand(HostOs.WINDOWS, file).get(0));
        assertEquals("open", UpdateService.installCommand(HostOs.MAC, file).get(0));
    }
}
