package fr.quartierconnect.desktopapp.util;

import java.util.Locale;

/**
 * The operating system the desktop app is running on, with the native installer
 * extension used for that platform. Used by update and uninstall flows to pick
 * the right release artifact and system command.
 */
public enum HostOs {
    LINUX(".deb"),
    WINDOWS(".msi"),
    MAC(".dmg"),
    UNKNOWN("");

    private final String installerExtension;

    HostOs(String installerExtension) {
        this.installerExtension = installerExtension;
    }

    public String installerExtension() {
        return installerExtension;
    }

    public static HostOs detect() {
        return fromName(System.getProperty("os.name", ""));
    }

    static HostOs fromName(String osName) {
        String name = osName.toLowerCase(Locale.ROOT);
        if (name.contains("win")) return WINDOWS;
        if (name.contains("mac") || name.contains("darwin")) return MAC;
        if (name.contains("nux") || name.contains("nix") || name.contains("aix")) return LINUX;
        return UNKNOWN;
    }
}
