package fr.quartierconnect.desktopapp.database;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.util.UUID;

public class SQLiteDatabase {

    /** Read fresh each call so a test-set sqlite.url is always honored, regardless of class-load order. */
    private static String dbUrl() {
        return System.getProperty("sqlite.url", "jdbc:sqlite:quartierconnect.db");
    }

    /** Cached session for offline-resume. Stores email only — tokens are in the OS keychain via TokenVault. */
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

            // Migration: drop plaintext token columns from pre-keychain databases
            try {
                stmt.executeUpdate("ALTER TABLE session DROP COLUMN access_token");
            } catch (SQLException ignored) {}
            try {
                stmt.executeUpdate("ALTER TABLE session DROP COLUMN refresh_token");
            } catch (SQLException ignored) {}

            // Migration: soft-delete tombstone for local incidents
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
            {null, "Lampadaire cassé rue de la Paix", "Le lampadaire n°47 est éteint depuis 3 jours, risque pour les piétons.", "open", twoDays, twoDays},
            {null, "Nid de poule avenue Voltaire", "Nid de poule de 30cm, dangereux pour les cyclistes.", "in_progress", yesterday, yesterday},
            {null, "Graffitis école primaire Rousseau", "Tags obscènes sur le mur est, à effacer avant la rentrée.", "open", yesterday, yesterday},
            {null, "Conteneur débordant rue du Moulin", "Poubelle non collectée depuis 5 jours.", "resolved", twoDays, now},
            {null, "Fuite d'eau trottoir nord", "Flaque persistante depuis 48h, risque de verglas.", "open", now, now},
            {null, "Banc cassé parc central", "Banc en bois détérioré, risque de blessure pour les enfants.", "in_progress", yesterday, now},
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
                "Les habitants signalent plusieurs pannes ce mois.", // local desc
                "open",
                yesterday, yesterday,
                "Éclairage défaillant place de la République",    // base title (original)
                "Problème signalé par la mairie.",                // base desc
                "open",
                yesterday,
                "Problème d'éclairage — pris en charge par les services techniques", // remote title
                "Intervention planifiée le 15 du mois.",          // remote desc
                "in_progress"                                     // remote status
            },
            {
                "demo-conflict-002",
                "Trottoir dégradé impasse des Lilas",
                "La surface est irrégulière, risque de chute pour les personnes âgées.",
                "in_progress",
                yesterday, now,
                "Trottoir dégradé impasse des Lilas",
                "Surface abîmée signalée.",
                "open",
                yesterday,
                "Trottoir dégradé impasse des Lilas",
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

    /**
     * Insert two fresh conflict incidents for Three-Way Merge demo/testing.
     * Uses a timestamp suffix on remote_id to avoid collisions with previous calls.
     * Safe to call multiple times — each call creates distinct rows.
     */
    public static void insertDemoConflicts() {
        String now = Instant.now().toString();
        String yesterday = Instant.now().minusSeconds(86400).toString();

        String sql = """
            INSERT INTO incidents
                (remote_id, title, description, status, is_dirty, created_at, updated_at,
                 base_title, base_description, base_status, base_updated_at,
                 is_conflict, remote_title, remote_description, remote_status)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            """;

        Object[][] conflicts = {
            {
                UUID.randomUUID().toString(),
                "Fuite d'eau carrefour Nord [local modifié]",
                "La fuite a empiré, signalement mairie en urgence.",
                "in_progress",
                yesterday, yesterday,
                "Fuite d'eau carrefour Nord",
                "Légère fuite signalée par un habitant.",
                "open",
                yesterday,
                "Fuite d'eau carrefour Nord [serveur]",
                "Intervention équipe technique prévue demain.",
                "resolved"
            },
            {
                UUID.randomUUID().toString(),
                "Éclairage parking Saint-Jean",
                "4 lampadaires sur 6 défaillants depuis lundi.",
                "open",
                yesterday, now,
                "Éclairage parking Saint-Jean",
                "1 lampadaire défaillant signalé.",
                "open",
                yesterday,
                "Éclairage parking Saint-Jean",
                "Technicien sur place, réparation en cours.",
                "in_progress"
            }
        };

        try (Connection conn = getConnection(); PreparedStatement ps = conn.prepareStatement(sql)) {
            for (Object[] row : conflicts) {
                for (int i = 0; i < row.length; i++) ps.setString(i + 1, (String) row[i]);
                ps.addBatch();
            }
            ps.executeBatch();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to insert demo conflicts", e);
        }
    }

    /** Persist the user's email for offline display (upsert on id=1). Tokens are stored separately via TokenVault. */
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
            // Non-critical — silently fail, email just won't show offline
        }
    }

    /** Load the persisted session email, or null if none. */
    public static SessionRecord loadSession() {
        String sql = "SELECT email, saved_at FROM session WHERE id = 1";
        try (Connection conn = getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) {
                return new SessionRecord(rs.getString("email"), rs.getString("saved_at"));
            }
        } catch (SQLException e) {
            // Table may not exist yet in older DBs — safe to return null
        }
        return null;
    }

    /** Delete the persisted session email (called on logout). */
    public static void clearSession() {
        String sql = "DELETE FROM session WHERE id = 1";
        try (Connection conn = getConnection(); PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.executeUpdate();
        } catch (SQLException e) {
            // Non-critical
        }
    }

    public static void logSync(boolean success) {
        String sql = "INSERT INTO sync_log (synced_at, success) VALUES (?, ?)";
        try (Connection conn = getConnection(); PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, Instant.now().toString());
            stmt.setInt(2, success ? 1 : 0);
            stmt.executeUpdate();
        } catch (SQLException e) {
            // Non-critical — silently fail rather than crashing the sync worker
        }
    }

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(dbUrl());
    }
}
