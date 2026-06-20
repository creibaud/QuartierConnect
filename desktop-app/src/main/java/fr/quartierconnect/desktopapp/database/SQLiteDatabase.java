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
            {null, "Broken streetlight on Peace Street", "Streetlight no. 47 has been out for 3 days, a hazard for pedestrians.", "open", twoDays, twoDays},
            {null, "Pothole on Voltaire Avenue", "A 30cm pothole, dangerous for cyclists.", "in_progress", yesterday, yesterday},
            {null, "Graffiti at Rousseau primary school", "Obscene tags on the east wall, to be removed before the new term.", "open", yesterday, yesterday},
            {null, "Overflowing bin on Mill Street", "Garbage not collected for 5 days.", "resolved", twoDays, now},
            {null, "Water leak on north sidewalk", "Persistent puddle for 48h, risk of black ice.", "open", now, now},
            {null, "Broken bench in central park", "Damaged wooden bench, risk of injury to children.", "in_progress", yesterday, now},
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
                "Faulty lighting at Republic Square",             // local title (edited)
                "Residents report several outages this month.",   // local desc
                "open",
                yesterday, yesterday,
                "Faulty lighting at Republic Square",             // base title (original)
                "Problem reported by the town hall.",             // base desc
                "open",
                yesterday,
                "Lighting issue - handled by the technical services", // remote title
                "Intervention scheduled for the 15th of the month.",  // remote desc
                "in_progress"                                     // remote status
            },
            {
                "demo-conflict-002",
                "Damaged sidewalk on Lilac Lane",
                "The surface is uneven, a fall risk for elderly people.",
                "in_progress",
                yesterday, now,
                "Damaged sidewalk on Lilac Lane",
                "Damaged surface reported.",
                "open",
                yesterday,
                "Damaged sidewalk on Lilac Lane",
                "Repair carried out by the teams this morning.",
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
                "Water leak at North junction [local edited]",
                "The leak has worsened, urgent report to the town hall.",
                "in_progress",
                yesterday, yesterday,
                "Water leak at North junction",
                "Minor leak reported by a resident.",
                "open",
                yesterday,
                "Water leak at North junction [server]",
                "Technical team intervention scheduled for tomorrow.",
                "resolved"
            },
            {
                UUID.randomUUID().toString(),
                "Lighting at Saint-Jean parking lot",
                "4 of 6 streetlights faulty since Monday.",
                "open",
                yesterday, now,
                "Lighting at Saint-Jean parking lot",
                "1 faulty streetlight reported.",
                "open",
                yesterday,
                "Lighting at Saint-Jean parking lot",
                "Technician on site, repair in progress.",
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
        return DriverManager.getConnection(DB_URL);
    }
}
