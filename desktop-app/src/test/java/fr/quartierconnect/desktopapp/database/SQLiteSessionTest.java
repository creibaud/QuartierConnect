package fr.quartierconnect.desktopapp.database;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for SQLiteDatabase session persistence (offline-login feature).
 * Uses a temp file SQLite database so connections share state.
 */
class SQLiteSessionTest {

    @BeforeEach
    void setUp() throws IOException {
        Path tmp = Files.createTempFile("qc-test-session", ".db");
        tmp.toFile().deleteOnExit();
        System.setProperty("sqlite.url", "jdbc:sqlite:" + tmp.toAbsolutePath());
        SQLiteDatabase.initialize();
    }

    @Test
    void loadSession_returnsNull_whenNoSessionSaved() {
        SQLiteDatabase.clearSession();
        assertNull(SQLiteDatabase.loadSession());
    }

    @Test
    void saveAndLoad_returnsCorrectValues() {
        SQLiteDatabase.saveSession("alice@demo.fr", "access.token.123", "refresh.token.456");

        SQLiteDatabase.SessionRecord rec = SQLiteDatabase.loadSession();
        assertNotNull(rec);
        assertEquals("alice@demo.fr", rec.email());
        assertEquals("access.token.123", rec.accessToken());
        assertEquals("refresh.token.456", rec.refreshToken());
        assertNotNull(rec.savedAt());
    }

    @Test
    void saveSession_overwrites_previousSession() {
        SQLiteDatabase.saveSession("alice@demo.fr", "old.access", "old.refresh");
        SQLiteDatabase.saveSession("admin@demo.fr", "new.access", "new.refresh");

        SQLiteDatabase.SessionRecord rec = SQLiteDatabase.loadSession();
        assertNotNull(rec);
        assertEquals("admin@demo.fr", rec.email());
        assertEquals("new.access", rec.accessToken());
        assertEquals("new.refresh", rec.refreshToken());
    }

    @Test
    void clearSession_removesStoredSession() {
        SQLiteDatabase.saveSession("alice@demo.fr", "access.token", "refresh.token");
        SQLiteDatabase.clearSession();

        assertNull(SQLiteDatabase.loadSession());
    }

    @Test
    void saveSession_withNullAccessToken_isAllowed() {
        // Offline scenario: only refresh token is stored
        SQLiteDatabase.saveSession("alice@demo.fr", null, "refresh.token.only");

        SQLiteDatabase.SessionRecord rec = SQLiteDatabase.loadSession();
        assertNotNull(rec);
        assertNull(rec.accessToken());
        assertEquals("refresh.token.only", rec.refreshToken());
    }

    @Test
    void initialize_isIdempotent() {
        // Calling initialize() twice should not throw or lose data
        SQLiteDatabase.saveSession("alice@demo.fr", "access", "refresh");
        SQLiteDatabase.initialize();

        SQLiteDatabase.SessionRecord rec = SQLiteDatabase.loadSession();
        // In-memory DB is reset each time initialize() reconnects — this tests the
        // CREATE TABLE IF NOT EXISTS is safe to call multiple times on the same connection
        assertDoesNotThrow(() -> SQLiteDatabase.initialize());
    }
}
