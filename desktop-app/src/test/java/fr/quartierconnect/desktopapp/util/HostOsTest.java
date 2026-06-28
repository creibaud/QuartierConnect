package fr.quartierconnect.desktopapp.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class HostOsTest {

    @Test
    void fromName_detectsWindows() {
        assertEquals(HostOs.WINDOWS, HostOs.fromName("Windows 11"));
    }

    @Test
    void fromName_detectsMac() {
        assertEquals(HostOs.MAC, HostOs.fromName("Mac OS X"));
    }

    @Test
    void fromName_detectsLinux() {
        assertEquals(HostOs.LINUX, HostOs.fromName("Linux"));
    }

    @Test
    void fromName_returnsUnknown_forUnrecognised() {
        assertEquals(HostOs.UNKNOWN, HostOs.fromName("SomeFutureOS"));
    }

    @Test
    void installerExtension_matchesPlatformPackage() {
        assertEquals(".deb", HostOs.LINUX.installerExtension());
        assertEquals(".msi", HostOs.WINDOWS.installerExtension());
        assertEquals(".dmg", HostOs.MAC.installerExtension());
    }
}
