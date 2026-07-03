package fr.quartierconnect.desktopapp.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fr.quartierconnect.desktopapp.util.HostOs;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;
import java.util.logging.Logger;

/**
 * Interroge les Releases GitHub à la recherche de versions plus récentes de l'application
 * desktop et, à la demande, télécharge l'installateur natif pour la plateforme courante et le
 * lance afin que l'application se mette à jour sur place.
 */
public class UpdateService {

    private static final Logger LOG = Logger.getLogger(UpdateService.class.getName());

    private static final String CURRENT_VERSION = "1.0.0";
    private static final long CHECK_INTERVAL_HOURS = 24;
    private static final String REPOSITORY = "creibaud/QuartierConnect";
    private static final String LATEST_RELEASE_API =
            "https://api.github.com/repos/" + REPOSITORY + "/releases/latest";

    private static final AtomicReference<String> KNOWN_AVAILABLE_UPDATE = new AtomicReference<>();

    @FunctionalInterface
    interface ProcessRunner {
        Process run(List<String> command) throws IOException;
    }

    private final ScheduledExecutorService scheduler =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "update-checker");
                t.setDaemon(true);
                return t;
            });

    private final HttpClient http;
    private final ProcessRunner runner;

    private Consumer<String> onUpdateAvailable;

    public UpdateService() {
        this(HttpClient.newHttpClient(),
                command -> new ProcessBuilder(command).inheritIO().start());
    }

    UpdateService(HttpClient http, ProcessRunner runner) {
        this.http = http;
        this.runner = runner;
    }

    public static String currentVersion() {
        return CURRENT_VERSION;
    }

    /** Dernière version plus récente découverte par les vérifications jusqu'ici, s'il en existe une. */
    public static Optional<String> knownAvailableUpdate() {
        return Optional.ofNullable(KNOWN_AVAILABLE_UPDATE.get());
    }

    public void setOnUpdateAvailable(Consumer<String> callback) {
        this.onUpdateAvailable = callback;
    }

    /** Démarre les vérifications de mise à jour en arrière-plan. Se déclenche immédiatement puis toutes les 24 heures. */
    public void checkInBackground() {
        scheduler.scheduleAtFixedRate(this::performCheck, 0, CHECK_INTERVAL_HOURS, TimeUnit.HOURS);
    }

    public void shutdown() {
        scheduler.shutdownNow();
    }

    private void performCheck() {
        try {
            findAvailableUpdate().ifPresent(latestVersion -> {
                if (onUpdateAvailable != null) {
                    onUpdateAvailable.accept(latestVersion);
                }
            });
        } catch (Exception e) {
            LOG.fine("Update check failed (offline?): " + e.getMessage());
        }
    }

    /**
     * Compare la dernière version publiée à celle en cours d'exécution.
     *
     * @return la version plus récente lorsqu'une mise à jour existe, vide si déjà à jour
     * @throws IOException lorsque les informations de version ne peuvent pas être récupérées
     */
    public Optional<String> findAvailableUpdate() throws IOException {
        String response;
        try {
            response = ApiService.get("/health", null);
        } catch (Exception e) {
            throw new IOException("API injoignable", e);
        }
        if (response == null) {
            throw new IOException("API injoignable");
        }
        String latestVersion = parseVersion(response);
        if (latestVersion == null) {
            throw new IOException("Version du serveur illisible");
        }
        if (!isNewer(latestVersion, CURRENT_VERSION)) {
            return Optional.empty();
        }
        KNOWN_AVAILABLE_UPDATE.set(latestVersion);
        LOG.info("Update available: " + latestVersion);
        return Optional.of(latestVersion);
    }

    /**
     * Télécharge le dernier installateur pour cette plateforme et le lance. L'appelant
     * doit quitter l'application dès le retour de cette méthode pour que l'installateur puisse la remplacer.
     */
    public void downloadAndInstallLatest(Consumer<String> onStatus) throws IOException, InterruptedException {
        HostOs os = HostOs.detect();
        if (os == HostOs.UNKNOWN) {
            throw new IOException("Plateforme non prise en charge");
        }

        onStatus.accept("checking");
        List<ReleaseAsset> assets = fetchLatestAssets();
        Optional<ReleaseAsset> installer = selectInstaller(assets, os);
        if (installer.isEmpty()) {
            throw new IOException("Aucun installateur " + os.installerExtension() + " dans la dernière release");
        }

        onStatus.accept("downloading");
        Path downloaded = download(installer.get());

        onStatus.accept("launching");
        runner.run(installCommand(os, downloaded));
    }

    List<ReleaseAsset> fetchLatestAssets() throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(LATEST_RELEASE_API))
                .header("Accept", "application/vnd.github+json")
                .GET()
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IOException("GitHub a répondu " + response.statusCode());
        }
        return parseAssets(response.body());
    }

    static List<ReleaseAsset> parseAssets(String releaseJson) throws IOException {
        JsonNode assetsNode = new ObjectMapper().readTree(releaseJson).path("assets");
        List<ReleaseAsset> assets = new ArrayList<>();
        for (JsonNode asset : assetsNode) {
            String name = asset.path("name").asText(null);
            String url = asset.path("browser_download_url").asText(null);
            if (name != null && url != null) {
                assets.add(new ReleaseAsset(name, url));
            }
        }
        return assets;
    }

    static Optional<ReleaseAsset> selectInstaller(List<ReleaseAsset> assets, HostOs os) {
        String extension = os.installerExtension();
        if (extension.isEmpty()) return Optional.empty();
        return assets.stream()
                .filter(asset -> asset.name().toLowerCase(Locale.ROOT).endsWith(extension))
                .findFirst();
    }

    private Path download(ReleaseAsset asset) throws IOException, InterruptedException {
        Path target = Files.createTempFile("quartierconnect-update-", "-" + asset.name());
        HttpRequest request = HttpRequest.newBuilder(URI.create(asset.url())).GET().build();
        http.send(request, HttpResponse.BodyHandlers.ofFile(target));
        return target;
    }

    static List<String> installCommand(HostOs os, Path installer) {
        String path = installer.toString();
        return switch (os) {
            case LINUX -> List.of("pkexec", "apt-get", "install", "-y", path);
            case WINDOWS -> List.of("msiexec", "/i", path);
            case MAC -> List.of("open", path);
            case UNKNOWN -> throw new UnsupportedOperationException("Install not supported on this platform");
        };
    }

    private String parseVersion(String healthJson) {
        try {
            String version = new ObjectMapper().readTree(healthJson).path("version").asText(null);
            return (version != null && !version.isEmpty()) ? version : null;
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isNewer(String candidate, String current) {
        int[] c = parseVersionParts(candidate);
        int[] cur = parseVersionParts(current);
        for (int i = 0; i < 3; i++) {
            if (c[i] > cur[i]) return true;
            if (c[i] < cur[i]) return false;
        }
        return false;
    }

    private int[] parseVersionParts(String version) {
        String[] parts = version.split("\\.");
        int[] result = new int[3];
        for (int i = 0; i < 3 && i < parts.length; i++) {
            try {
                result[i] = Integer.parseInt(parts[i].trim());
            } catch (NumberFormatException ignored) {
                result[i] = 0;
            }
        }
        return result;
    }

    /** Artefact téléchargeable attaché à une release GitHub. */
    record ReleaseAsset(String name, String url) {}
}
