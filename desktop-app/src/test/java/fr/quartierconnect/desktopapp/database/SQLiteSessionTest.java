package fr.quartierconnect.desktopapp.database;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for SQLiteDatabase session persistence (offline-login feature).
 * Only email is persisted here — tokens are managed by TokenVault (OS keychain).
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
    void saveAndLoad_persistsEmail() {
        SQLiteDatabase.saveSession("alice@demo.fr");

        SQLiteDatabase.SessionRecord rec = SQLiteDatabase.loadSession();
        assertNotNull(rec);
        assertEquals("alice@demo.fr", rec.email());
        assertNotNull(rec.savedAt());
    }

    @Test
    void saveSession_overwrites_previousSession() {
        SQLiteDatabase.saveSession("alice@demo.fr");
        SQLiteDatabase.saveSession("admin@demo.fr");

        SQLiteDatabase.SessionRecord rec = SQLiteDatabase.loadSession();
        assertNotNull(rec);
        assertEquals("admin@demo.fr", rec.email());
    }

    @Test
    void clearSession_removesStoredSession() {
        SQLiteDatabase.saveSession("alice@demo.fr");
        SQLiteDatabase.clearSession();

        assertNull(SQLiteDatabase.loadSession());
    }

    @Test
    void initialize_isIdempotent() {
        SQLiteDatabase.saveSession("alice@demo.fr");
        assertDoesNotThrow(() -> SQLiteDatabase.initialize());
    }
}
