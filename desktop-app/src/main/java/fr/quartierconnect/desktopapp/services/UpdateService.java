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
import java.util.function.Consumer;
import java.util.logging.Logger;

/**
 * Checks GitHub Releases for newer versions of the desktop app and, on demand,
 * downloads the native installer for the current platform and launches it so the
 * app updates itself in place.
 */
public class UpdateService {

    private static final Logger LOG = Logger.getLogger(UpdateService.class.getName());

    private static final String CURRENT_VERSION = "1.0.0";
    private static final long CHECK_INTERVAL_HOURS = 24;
    private static final String REPOSITORY = "creibaud/QuartierConnect";
    private static final String LATEST_RELEASE_API =
            "https://api.github.com/repos/" + REPOSITORY + "/releases/latest";

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

    public void setOnUpdateAvailable(Consumer<String> callback) {
        this.onUpdateAvailable = callback;
    }

    /** Start background update checks. Fires immediately then every 24 hours. */
    public void checkInBackground() {
        scheduler.scheduleAtFixedRate(this::performCheck, 0, CHECK_INTERVAL_HOURS, TimeUnit.HOURS);
    }

    public void shutdown() {
        scheduler.shutdownNow();
    }

    private void performCheck() {
        try {
            String response = ApiService.get("/health", null);
            if (response == null) return;
            String latestVersion = parseVersion(response);
            if (latestVersion != null && isNewer(latestVersion, CURRENT_VERSION)) {
                LOG.info("Update available: " + latestVersion);
                if (onUpdateAvailable != null) {
                    onUpdateAvailable.accept(latestVersion);
                }
            }
        } catch (Exception e) {
            LOG.fine("Update check failed (offline?): " + e.getMessage());
        }
    }

    /**
     * Download the latest installer for this platform and launch it. The caller
     * should exit the app once this returns so the installer can replace it.
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

    /** A downloadable artifact attached to a GitHub release. */
    record ReleaseAsset(String name, String url) {}
}
