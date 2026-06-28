package fr.quartierconnect.desktopapp.services;

import fr.quartierconnect.desktopapp.util.HostOs;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UninstallServiceTest {

    private static UninstallService on(HostOs os) {
        return new UninstallService(os, command -> {
            throw new AssertionError("process should not run during command resolution");
        });
    }

    @Test
    void linuxCommand_removesDebPackageByName() {
        List<String> command = on(HostOs.LINUX).uninstallCommand();
        assertTrue(command.contains(UninstallService.LINUX_PACKAGE_NAME));
        assertEquals("pkexec", command.get(0));
    }

    @Test
    void windowsCommand_opensAppsAndFeatures() {
        assertTrue(on(HostOs.WINDOWS).uninstallCommand().contains("ms-settings:appsfeatures"));
    }

    @Test
    void macCommand_opensApplicationsFolder() {
        assertEquals(List.of("open", "/Applications"), on(HostOs.MAC).uninstallCommand());
    }

    @Test
    void unknownPlatform_isRejected() {
        assertThrows(UnsupportedOperationException.class, () -> on(HostOs.UNKNOWN).uninstallCommand());
    }

    @Test
    void uninstall_launchesTheResolvedCommand() throws Exception {
        List<String>[] captured = new List[1];
        UninstallService service = new UninstallService(HostOs.MAC, command -> {
            captured[0] = command;
            return null;
        });
        service.uninstall();
        assertEquals(List.of("open", "/Applications"), captured[0]);
    }
}
