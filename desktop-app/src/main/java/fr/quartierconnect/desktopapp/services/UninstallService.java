package fr.quartierconnect.desktopapp.services;

import fr.quartierconnect.desktopapp.util.HostOs;
import java.io.IOException;
import java.util.List;

/**
 * Déclenche la suppression de l'application via le gestionnaire de paquets natif installé
 * par jpackage. La commande est résolue selon la plateforme ; son lancement est délégué à un
 * {@link ProcessRunner} afin que la logique de résolution reste testable.
 */
public class UninstallService {

    /** Nom du paquet Linux déclaré à jpackage via {@code --linux-package-name}. */
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

    /** Commande système qui supprime l'application installée. */
    public List<String> uninstallCommand() {
        return switch (os) {
            case LINUX -> List.of("pkexec", "apt-get", "remove", "-y", LINUX_PACKAGE_NAME);
            case WINDOWS -> List.of("cmd", "/c", "start", "ms-settings:appsfeatures");
            case MAC -> List.of("open", "/Applications");
            case UNKNOWN -> throw new UnsupportedOperationException("Uninstall not supported on this platform");
        };
    }

    /** Lance le désinstallateur natif. L'appelant doit quitter l'application ensuite. */
    public void uninstall() throws IOException {
        runner.run(uninstallCommand());
    }
}
