package fr.quartierconnect.desktopapp.util;

import java.util.Locale;

/** Host platform with its native installer extension, used by the update and uninstall flows. */
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
