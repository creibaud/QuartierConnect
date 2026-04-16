package fr.quartierconnect.desktopapp.database;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class IncidentRepositoryTest {

    // Held open so the named in-memory database survives between connections.
    @SuppressWarnings("unused")
    private static Connection keepAlive;

    @BeforeAll
    static void initDb() throws SQLException {
        System.setProperty("sqlite.url", "jdbc:sqlite:file:testmem?mode=memory&cache=shared");
        keepAlive = SQLiteDatabase.getConnection();
        SQLiteDatabase.initialize();
    }

    // Each test uses a globally unique remote ID to avoid cross-test interference
    // without relying on DELETE (which would require cross-class DB lifecycle management).

    @Test
    void updateBase_storesAncestorSnapshot() throws SQLException {
        IncidentRepository repo = new IncidentRepository();
        int localId = repo.insertDirty("base-title", "base-desc");
        assertDoesNotThrow(() ->
                repo.updateBase(localId, "base-title", "base-desc", "open", Instant.now().toString()));
    }

    @Test
    void upsertFromServer_noAncestor_insertsCleanRow() throws SQLException {
        IncidentRepository repo = new IncidentRepository();
        String remoteId = "repo-test-no-ancestor-" + System.nanoTime();

        repo.upsertFromServer(remoteId, "server title", "server desc", "open",
                Instant.now().toString());

        List<IncidentRepository.Incident> all = repo.listAll();
        IncidentRepository.Incident inserted = all.stream()
                .filter(i -> remoteId.equals(i.remoteId())).findFirst().orElse(null);

        assertNotNull(inserted);
        assertEquals("server title", inserted.title());
        assertFalse(inserted.isDirty());
        assertFalse(inserted.isConflict());
    }

    @Test
    void upsertFromServer_remoteOnlyChange_appliesCleanMerge() throws SQLException {
        IncidentRepository repo = new IncidentRepository();
        String remoteId = "repo-test-remote-only-" + System.nanoTime();
        String t0 = "2026-01-01T10:00:00Z";
        String t1 = "2026-01-02T10:00:00Z";

        repo.upsertFromServer(remoteId, "original", "desc", "open", t0);
        repo.upsertFromServer(remoteId, "original", "desc", "in_progress", t1);

        IncidentRepository.Incident updated = repo.listAll().stream()
                .filter(i -> remoteId.equals(i.remoteId())).findFirst().orElseThrow();

        assertFalse(updated.isConflict());
        assertEquals("in_progress", updated.status());
    }

    @Test
    void upsertFromServer_trueConflict_flagsConflict() throws SQLException {
        IncidentRepository repo = new IncidentRepository();
        String remoteId = "repo-test-conflict-" + System.nanoTime();
        String t0 = "2026-01-01T10:00:00Z";
        String t1 = "2026-01-02T10:00:00Z";

        repo.upsertFromServer(remoteId, "original", "desc", "open", t0);
        int localId = repo.listAll().stream()
                .filter(i -> remoteId.equals(i.remoteId())).findFirst().orElseThrow().localId();

        repo.updateBase(localId, "original", "desc", "open", t0);

        try (Connection conn = SQLiteDatabase.getConnection();
             var stmt = conn.prepareStatement(
                     "UPDATE incidents SET title = 'local edit', is_dirty = 1 WHERE id = ?")) {
            stmt.setInt(1, localId);
            stmt.executeUpdate();
        }

        repo.upsertFromServer(remoteId, "remote edit", "desc", "open", t1);

        IncidentRepository.Incident conflicted = repo.listConflicts().stream()
                .filter(i -> remoteId.equals(i.remoteId())).findFirst().orElse(null);

        assertNotNull(conflicted);
        assertEquals("remote edit", conflicted.remoteTitle());
        assertEquals("local edit", conflicted.title());
    }

    @Test
    void updateLocally_changesValuesAndMarksDirty() throws SQLException {
        IncidentRepository repo = new IncidentRepository();
        int localId = repo.insertDirty("original title", "original desc");
        repo.markSynced(localId);

        repo.updateLocally(localId, "updated title", "updated desc", "in_progress");

        IncidentRepository.Incident updated = repo.listAll().stream()
                .filter(i -> i.localId() == localId).findFirst().orElseThrow();

        assertEquals("updated title", updated.title());
        assertEquals("updated desc", updated.description());
        assertEquals("in_progress", updated.status());
        assertTrue(updated.isDirty());
    }

    @Test
    void updateLocally_nonExistentId_noException() {
        IncidentRepository repo = new IncidentRepository();
        assertDoesNotThrow(() -> repo.updateLocally(Integer.MAX_VALUE, "t", "d", "open"));
    }

    @Test
    void deleteByLocalId_removesRow() throws SQLException {
        IncidentRepository repo = new IncidentRepository();
        int localId = repo.insertDirty("to be deleted", "desc");
        int countBefore = repo.countAll();

        repo.deleteByLocalId(localId);

        assertEquals(countBefore - 1, repo.countAll());
        boolean stillPresent = repo.listAll().stream().anyMatch(i -> i.localId() == localId);
        assertFalse(stillPresent);
    }

    @Test
    void updateStatusLocally_changesStatusAndMarksDirty() throws SQLException {
        IncidentRepository repo = new IncidentRepository();
        int localId = repo.insertDirty("status test", "desc");
        repo.markSynced(localId);

        repo.updateStatusLocally(localId, "resolved");

        IncidentRepository.Incident updated = repo.listAll().stream()
                .filter(i -> i.localId() == localId).findFirst().orElseThrow();

        assertEquals("resolved", updated.status());
        assertTrue(updated.isDirty());
    }

    @Test
    void countAll_countDirty_countConflicts_returnCorrectValues() throws SQLException {
        IncidentRepository repo = new IncidentRepository();
        int totalBefore = repo.countAll();
        int dirtyBefore = repo.countDirty();

        int newId = repo.insertDirty("count test", "desc");
        assertEquals(totalBefore + 1, repo.countAll());
        assertEquals(dirtyBefore + 1, repo.countDirty());

        repo.markSynced(newId);
        assertEquals(totalBefore + 1, repo.countAll());
        assertEquals(dirtyBefore, repo.countDirty());

        int conflictsBefore = repo.countConflicts();
        assertEquals(conflictsBefore, repo.countConflicts());
    }

    @Test
    void insertDemoConflicts_insertsConflictRows() throws SQLException {
        IncidentRepository repo = new IncidentRepository();
        int conflictsBefore = repo.countConflicts();

        SQLiteDatabase.insertDemoConflicts();

        int conflictsAfter = repo.countConflicts();
        assertEquals(conflictsBefore + 2, conflictsAfter);

        List<IncidentRepository.Incident> conflicts = repo.listConflicts();
        assertTrue(conflicts.stream().anyMatch(i -> i.remoteTitle() != null));
        assertTrue(conflicts.stream().anyMatch(IncidentRepository.Incident::isConflict));
    }

    @Test
    void resolveConflict_acceptRemote_clearsFlag() throws SQLException {
        IncidentRepository repo = new IncidentRepository();
        String remoteId = "repo-test-resolve-" + System.nanoTime();
        String t0 = "2026-01-01T10:00:00Z";
        String t1 = "2026-01-02T10:00:00Z";

        repo.upsertFromServer(remoteId, "original", "desc", "open", t0);
        int localId = repo.listAll().stream()
                .filter(i -> remoteId.equals(i.remoteId())).findFirst().orElseThrow().localId();

        repo.updateBase(localId, "original", "desc", "open", t0);

        try (Connection conn = SQLiteDatabase.getConnection();
             var stmt = conn.prepareStatement(
                     "UPDATE incidents SET title = 'local edit', is_dirty = 1 WHERE id = ?")) {
            stmt.setInt(1, localId);
            stmt.executeUpdate();
        }

        repo.upsertFromServer(remoteId, "remote edit", "desc", "open", t1);

        repo.resolveConflict(localId, true);

        boolean stillConflicted = repo.listConflicts().stream()
                .anyMatch(i -> remoteId.equals(i.remoteId()));
        assertFalse(stillConflicted);

        IncidentRepository.Incident resolved = repo.listAll().stream()
                .filter(i -> remoteId.equals(i.remoteId())).findFirst().orElseThrow();
        assertEquals("remote edit", resolved.title());
        assertFalse(resolved.isDirty());
    }
}
