package fr.quartierconnect.desktopapp.database;

import fr.quartierconnect.desktopapp.util.HostOs;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;

public class SQLiteDatabase {

    private static final String APP_DIR_NAME = "QuartierConnect";
    private static final String DB_FILE_NAME = "quartierconnect.db";

    /**
     * Re-read on each call so a test-set {@code sqlite.url} wins regardless of class-load
     * order. Without an override the file lives under the per-user data directory: an
     * installed app runs from a read-only location (e.g. {@code C:\Program Files}) where a
     * relative path would fail to create for a standard, non-elevated user.
     */
    private static String dbUrl() {
        String override = System.getProperty("sqlite.url");
        if (override != null && !override.isBlank()) {
            return override;
        }
        return "jdbc:sqlite:" + databaseFile();
    }

    private static Path databaseFile() {
        Path dir = userDataDirectory();
        try {
            Files.createDirectories(dir);
        } catch (IOException e) {
            throw new RuntimeException("Cannot create application data directory: " + dir, e);
        }
        return dir.resolve(DB_FILE_NAME);
    }

    /** Per-user, writable data directory for the host OS. */
    private static Path userDataDirectory() {
        String home = System.getProperty("user.home");
        return switch (HostOs.detect()) {
            case WINDOWS -> {
                String appData = System.getenv("APPDATA");
                Path base = (appData != null && !appData.isBlank())
                        ? Paths.get(appData)
                        : Paths.get(home, "AppData", "Roaming");
                yield base.resolve(APP_DIR_NAME);
            }
            case MAC -> Paths.get(home, "Library", "Application Support", APP_DIR_NAME);
            default -> {
                String xdg = System.getenv("XDG_DATA_HOME");
                Path base = (xdg != null && !xdg.isBlank())
                        ? Paths.get(xdg)
                        : Paths.get(home, ".local", "share");
                yield base.resolve(APP_DIR_NAME);
            }
        };
    }

    /** Cached session for offline resume. Email only — tokens live in the OS keychain via TokenVault. */
    public record SessionRecord(String email, String savedAt) {}

    public static void initialize() {
        try (Connection conn = getConnection(); Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS incidents (
                    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                    remote_id          TEXT,
                    title              TEXT    NOT NULL,
                    description        TEXT,
                    status             TEXT    NOT NULL DEFAULT 'open',
                    is_dirty           INTEGER NOT NULL DEFAULT 1,
                    created_at         TEXT    NOT NULL,
                    updated_at         TEXT    NOT NULL,
                    base_title         TEXT,
                    base_description   TEXT,
                    base_status        TEXT,
                    base_updated_at    TEXT,
                    is_conflict        INTEGER NOT NULL DEFAULT 0,
                    remote_title       TEXT,
                    remote_description TEXT,
                    remote_status      TEXT
                )
                """);

            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS sync_log (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    synced_at  TEXT    NOT NULL,
                    success    INTEGER NOT NULL
                )
                """);

            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS session (
                    id       INTEGER PRIMARY KEY,
                    email    TEXT NOT NULL,
                    saved_at TEXT NOT NULL
                )
                """);

            seedIfEmpty(conn);

            // Drop plaintext token columns from pre-keychain databases
            try {
                stmt.executeUpdate("ALTER TABLE session DROP COLUMN access_token");
            } catch (SQLException ignored) {}
            try {
                stmt.executeUpdate("ALTER TABLE session DROP COLUMN refresh_token");
            } catch (SQLException ignored) {}

            // Soft-delete marker for local incidents
            try {
                stmt.executeUpdate("ALTER TABLE incidents ADD COLUMN deleted_at TEXT");
            } catch (SQLException ignored) {}

        } catch (SQLException e) {
            throw new RuntimeException("Failed to initialize SQLite database", e);
        }
    }

    private static void seedIfEmpty(Connection conn) throws SQLException {
        try (PreparedStatement check = conn.prepareStatement("SELECT COUNT(*) FROM incidents");
             ResultSet rs = check.executeQuery()) {
            if (rs.next() && rs.getInt(1) > 0) return;
        }

        String now = Instant.now().toString();
        String yesterday = Instant.now().minusSeconds(86400).toString();
        String twoDays = Instant.now().minusSeconds(172800).toString();

        String sql = """
            INSERT INTO incidents (remote_id, title, description, status, is_dirty, created_at, updated_at)
            VALUES (?, ?, ?, ?, 0, ?, ?)
            """;

        Object[][] demos = {
            {null, "Lampadaire cassé rue de la Paix", "Le lampadaire n° 47 est éteint depuis 3 jours, un danger pour les piétons.", "open", twoDays, twoDays},
            {null, "Nid-de-poule avenue Voltaire", "Un nid-de-poule de 30 cm, dangereux pour les cyclistes.", "in_progress", yesterday, yesterday},
            {null, "Graffiti à l'école primaire Rousseau", "Tags obscènes sur le mur est, à nettoyer avant la rentrée.", "open", yesterday, yesterday},
            {null, "Poubelle qui déborde rue du Moulin", "Ordures non ramassées depuis 5 jours.", "resolved", twoDays, now},
            {null, "Fuite d'eau sur le trottoir nord", "Flaque persistante depuis 48 h, risque de verglas.", "open", now, now},
            {null, "Banc cassé au square du quartier", "Banc en bois endommagé, risque de blessure pour les enfants.", "in_progress", yesterday, now},
        };

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (Object[] row : demos) {
                ps.setString(1, (String) row[0]);
                ps.setString(2, (String) row[1]);
                ps.setString(3, (String) row[2]);
                ps.setString(4, (String) row[3]);
                ps.setString(5, (String) row[4]);
                ps.setString(6, (String) row[5]);
                ps.addBatch();
            }
            ps.executeBatch();
        }

        seedConflicts(conn, yesterday, now);
    }

    private static void seedConflicts(Connection conn, String yesterday, String now) throws SQLException {
        String sql = """
            INSERT INTO incidents
                (remote_id, title, description, status, is_dirty, created_at, updated_at,
                 base_title, base_description, base_status, base_updated_at,
                 is_conflict, remote_title, remote_description, remote_status)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            """;

        Object[][] conflicts = {
            {
                "demo-conflict-001",
                "Éclairage défaillant place de la République",    // local title (edited)
                "Les habitants signalent plusieurs coupures ce mois-ci.", // local description
                "open",
                yesterday, yesterday,
                "Éclairage défaillant place de la République",    // base title
                "Problème signalé par la mairie.",                // base description
                "open",
                yesterday,
                "Panne d'éclairage - prise en charge par les services techniques", // remote title
                "Intervention prévue le 15 du mois.",             // remote description
                "in_progress"                                     // remote status
            },
            {
                "demo-conflict-002",
                "Trottoir dégradé rue des Lilas",
                "Le revêtement est irrégulier, risque de chute pour les personnes âgées.",
                "in_progress",
                yesterday, now,
                "Trottoir dégradé rue des Lilas",
                "Revêtement dégradé signalé.",
                "open",
                yesterday,
                "Trottoir dégradé rue des Lilas",
                "Réparation effectuée par les équipes ce matin.",
                "resolved"
            }
        };

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (Object[] row : conflicts) {
                ps.setString(1,  (String) row[0]);
                ps.setString(2,  (String) row[1]);
                ps.setString(3,  (String) row[2]);
                ps.setString(4,  (String) row[3]);
                ps.setString(5,  (String) row[4]);
                ps.setString(6,  (String) row[5]);
                ps.setString(7,  (String) row[6]);
                ps.setString(8,  (String) row[7]);
                ps.setString(9,  (String) row[8]);
                ps.setString(10, (String) row[9]);
                ps.setString(11, (String) row[10]);
                ps.setString(12, (String) row[11]);
                ps.setString(13, (String) row[12]);
                ps.addBatch();
            }
            ps.executeBatch();
        }
    }

    /** Upserts the user's email (id=1) for offline display. Tokens are stored via TokenVault. */
    public static void saveSession(String email) {
        String sql = """
            INSERT INTO session (id, email, saved_at)
            VALUES (1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                email = excluded.email,
                saved_at = excluded.saved_at
            """;
        try (Connection conn = getConnection(); PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, email);
            stmt.setString(2, Instant.now().toString());
            stmt.executeUpdate();
        } catch (SQLException e) {
            // non-critical, the email just won't show offline
        }
    }

    /** Returns the persisted session, or null if none. */
    public static SessionRecord loadSession() {
        String sql = "SELECT email, saved_at FROM session WHERE id = 1";
        try (Connection conn = getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) {
                return new SessionRecord(rs.getString("email"), rs.getString("saved_at"));
            }
        } catch (SQLException e) {
            // table may not exist yet in older databases
        }
        return null;
    }

    public static void clearSession() {
        String sql = "DELETE FROM session WHERE id = 1";
        try (Connection conn = getConnection(); PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.executeUpdate();
        } catch (SQLException e) {
            // non-critical
        }
    }

    public static void logSync(boolean success) {
        String sql = "INSERT INTO sync_log (synced_at, success) VALUES (?, ?)";
        try (Connection conn = getConnection(); PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, Instant.now().toString());
            stmt.setInt(2, success ? 1 : 0);
            stmt.executeUpdate();
        } catch (SQLException e) {
            // non-critical, don't crash the sync worker
        }
    }

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(dbUrl());
    }
}
