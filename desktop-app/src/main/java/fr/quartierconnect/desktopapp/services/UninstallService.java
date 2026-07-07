package fr.quartierconnect.desktopapp.services;

import fr.quartierconnect.desktopapp.util.HostOs;
import java.io.IOException;
import java.util.List;

/**
 * Removes the app via the platform's native package manager (jpackage install).
 * Launching goes through a {@link ProcessRunner} so command resolution stays testable.
 */
public class UninstallService {

    /** Linux package name declared to jpackage via {@code --linux-package-name}. */
    static final String LINUX_PACKAGE_NAME = "quartierconnect";

    @FunctionalInterface
    interface ProcessRunner {
        Process run(List<String> command) throws IOException;
    }

    private final HostOs os;
    private final ProcessRunner runner;

    public UninstallService() {
        this(HostOs.detect(), command -> new ProcessBuilder(command).inheritIO().start());
    }

    UninstallService(HostOs os, ProcessRunner runner) {
        this.os = os;
        this.runner = runner;
    }

    public List<String> uninstallCommand() {
        return switch (os) {
            case LINUX -> List.of("pkexec", "apt-get", "remove", "-y", LINUX_PACKAGE_NAME);
            case WINDOWS -> List.of("cmd", "/c", "start", "ms-settings:appsfeatures");
            case MAC -> List.of("open", "/Applications");
            case UNKNOWN -> throw new UnsupportedOperationException("Uninstall not supported on this platform");
        };
    }

    /** Launches the native uninstaller. Caller should exit the app afterwards. */
    public void uninstall() throws IOException {
        runner.run(uninstallCommand());
    }
}
