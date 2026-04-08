package fr.quartierconnect.desktopapp.database;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;

public class SQLiteDatabase {

    private static final String DB_URL = System.getProperty("sqlite.url", "jdbc:sqlite:quartierconnect.db");

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

            // Migration: drop plaintext token columns from pre-keychain databases
            try {
                stmt.executeUpdate("ALTER TABLE session DROP COLUMN access_token");
            } catch (SQLException ignored) {}
            try {
                stmt.executeUpdate("ALTER TABLE session DROP COLUMN refresh_token");
            } catch (SQLException ignored) {}

        } catch (SQLException e) {
            throw new RuntimeException("Failed to initialize SQLite database", e);
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
        return DriverManager.getConnection(DB_URL);
    }
}
