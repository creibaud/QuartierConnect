package fr.quartierconnect.desktopapp.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fr.quartierconnect.desktopapp.util.HostOs;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
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
    private static final String CHECKSUMS_ASSET_NAME = "SHA256SUMS";

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
        this(HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NORMAL).build(),
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

        onStatus.accept("verifying");
        verifyIntegrity(assets, installer.get(), downloaded);

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
        HttpResponse<Path> response = http.send(request, HttpResponse.BodyHandlers.ofFile(target));
        if (response.statusCode() != 200) {
            Files.deleteIfExists(target);
            throw new IOException(
                    "Téléchargement de l'installateur échoué (HTTP " + response.statusCode() + ")");
        }
        return target;
    }

    /**
     * Vérifie l'intégrité de l'installateur téléchargé contre l'empreinte SHA-256 publiée
     * dans le fichier {@code SHA256SUMS} de la release. Interrompt l'installation en levant
     * une {@link SecurityException} si le fichier de sommes, l'entrée correspondante ou la
     * concordance de l'empreinte fait défaut.
     */
    private void verifyIntegrity(List<ReleaseAsset> assets, ReleaseAsset installer, Path downloadedFile)
            throws IOException, InterruptedException {
        ReleaseAsset checksums = selectChecksums(assets).orElseThrow(() -> new SecurityException(
                "Vérification impossible : fichier " + CHECKSUMS_ASSET_NAME + " absent de la release"));

        String expectedHash = expectedHashFor(downloadText(checksums.url()), installer.name())
                .orElseThrow(() -> new SecurityException("Vérification impossible : aucune empreinte pour "
                        + installer.name() + " dans " + CHECKSUMS_ASSET_NAME));

        String actualHash = sha256Hex(downloadedFile);
        if (!actualHash.equalsIgnoreCase(expectedHash)) {
            throw new SecurityException("Intégrité de l'installateur invalide pour " + installer.name()
                    + " — attendu " + expectedHash + ", calculé " + actualHash + ". Installation annulée.");
        }
        LOG.info("Installer integrity verified for " + installer.name());
    }

    static Optional<ReleaseAsset> selectChecksums(List<ReleaseAsset> assets) {
        return assets.stream()
                .filter(asset -> CHECKSUMS_ASSET_NAME.equals(asset.name()))
                .findFirst();
    }

    /**
     * Extrait l'empreinte hexadécimale attendue pour {@code fileName} d'un contenu SHA256SUMS.
     * Chaque ligne suit le format {@code <hex-sha256>  <filename>} (le marqueur de mode binaire
     * {@code *} éventuel devant le nom est ignoré).
     */
    static Optional<String> expectedHashFor(String checksumsContent, String fileName) {
        for (String line : checksumsContent.split("\\R")) {
            String[] fields = line.trim().split("\\s+", 2);
            if (fields.length < 2) {
                continue;
            }
            String entryName = fields[1].trim();
            if (entryName.startsWith("*")) {
                entryName = entryName.substring(1);
            }
            if (entryName.equals(fileName)) {
                return Optional.of(fields[0].trim());
            }
        }
        return Optional.empty();
    }

    static String sha256Hex(Path file) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream in = Files.newInputStream(file)) {
                byte[] buffer = new byte[8192];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    digest.update(buffer, 0, read);
                }
            }
            StringBuilder hex = new StringBuilder(digest.getDigestLength() * 2);
            for (byte b : digest.digest()) {
                hex.append(Character.forDigit((b >> 4) & 0xF, 16));
                hex.append(Character.forDigit(b & 0xF, 16));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IOException("Algorithme SHA-256 indisponible", e);
        }
    }

    private String downloadText(String url) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url)).GET().build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IOException(
                    "Téléchargement de " + CHECKSUMS_ASSET_NAME + " échoué (HTTP " + response.statusCode() + ")");
        }
        return response.body();
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
