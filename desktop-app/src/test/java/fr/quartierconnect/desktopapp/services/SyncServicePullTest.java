package fr.quartierconnect.desktopapp.services;

import fr.quartierconnect.desktopapp.database.IncidentRepository;
import fr.quartierconnect.desktopapp.database.SQLiteDatabase;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Drives {@link SyncService#pullIncidents} with a fake page fetcher (no network):
 * a full pull must paginate the whole scope before tombstoning.
 */
class SyncServicePullTest {

    @SuppressWarnings("unused")
    private static Connection keepAlive;

    @BeforeAll
    static void initDb() throws SQLException {
        System.setProperty("sqlite.url",
                "jdbc:sqlite:file:syncpulltest?mode=memory&cache=shared");
        keepAlive = SQLiteDatabase.getConnection();
        SQLiteDatabase.initialize();
    }

    // tombstoneOrphans is global, so isolate every test on a clean table.
    @BeforeEach
    void clearIncidents() throws SQLException {
        try (Connection conn = SQLiteDatabase.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("DELETE FROM incidents");
        }
    }

    private String serverTs() {
        return Instant.now().toString();
    }

    private String pageJson(List<String> remoteIds) {
        String items = remoteIds.stream()
                .map(id -> "{\"id\":\"" + id + "\",\"title\":\"T\",\"status\":\"open\","
                        + "\"updatedAt\":\"" + serverTs() + "\"}")
                .collect(Collectors.joining(","));
        return "[" + items + "]";
    }

    private int pageOf(String path) {
        int idx = path.indexOf("page=");
        String tail = path.substring(idx + "page=".length());
        int amp = tail.indexOf('&');
        return Integer.parseInt(amp >= 0 ? tail.substring(0, amp) : tail);
    }

    private List<String> syntheticIds(String prefix, int count) {
        List<String> ids = new ArrayList<>(count);
        for (int i = 0; i < count; i++) ids.add(prefix + "-" + i);
        return ids;
    }

    @Test
    void fullPull_keepsIncidentsFromLaterPages_andTombstonesTrueOrphans() throws Exception {
        String idFarPage = "kept-far-page-" + System.nanoTime();
        String orphan = "orphan-never-served-" + System.nanoTime();
        IncidentRepository repo = new IncidentRepository();
        // Both already exist locally with a remote id (synced earlier).
        repo.upsertFromServer(idFarPage, "far", "d", "open", serverTs());
        repo.upsertFromServer(orphan, "gone", "d", "open", serverTs());

        List<String> page1 = syntheticIds("p1-" + System.nanoTime(), 100);
        List<String> page2 = syntheticIds("p2-" + System.nanoTime(), 100);
        List<String> page3 = new ArrayList<>();
        page3.add(idFarPage);
        page3.addAll(syntheticIds("p3-" + System.nanoTime(), 36)); // size 37 < 100

        SyncService sync = new SyncService();
        sync.setPageFetcher((path, token) -> switch (pageOf(path)) {
            case 1 -> pageJson(page1);
            case 2 -> pageJson(page2);
            case 3 -> pageJson(page3);
            default -> "[]";
        });

        sync.pullIncidents("tok", Collections.emptySet());

        Set<String> remaining = repo.listAll().stream()
                .map(IncidentRepository.Incident::remoteId)
                .collect(Collectors.toCollection(HashSet::new));
        assertTrue(remaining.contains(idFarPage),
                "an incident served on page 3 must survive the tombstone pass");
        assertFalse(remaining.contains(orphan),
                "an incident absent from every page must be tombstoned");
    }

    @Test
    void fullPull_tombstonesOnEmptyLastPage() throws Exception {
        String orphan = "orphan-empty-page-" + System.nanoTime();
        IncidentRepository repo = new IncidentRepository();
        repo.upsertFromServer(orphan, "gone", "d", "open", serverTs());

        List<String> page1 = syntheticIds("full-" + System.nanoTime(), 100);
        SyncService sync = new SyncService();
        sync.setPageFetcher((path, token) ->
                pageOf(path) == 1 ? pageJson(page1) : "[]");

        sync.pullIncidents("tok", Collections.emptySet());

        boolean orphanPresent = repo.listAll().stream()
                .anyMatch(i -> orphan.equals(i.remoteId()));
        assertFalse(orphanPresent,
                "a full pull that reaches an empty last page must tombstone the orphan");
    }

    @Test
    void pull_reconcilesClampedStatusOnPushedRow() throws Exception {
        String remoteId = "clamped-" + System.nanoTime();
        IncidentRepository repo = new IncidentRepository();
        // Post-push state: we pushed a reopen ("open"), marked it synced,
        // and snapshotted the pushed values as the merge base.
        int localId = repo.insertDirty("T", "d");
        repo.assignRemoteId(localId, remoteId);
        repo.updateBase(localId, "T", "d", "open", "2026-07-01T10:00:00Z");
        repo.markSynced(localId);

        // The server clamped the reopen and kept "resolved".
        SyncService sync = new SyncService();
        sync.setPageFetcher((path, token) ->
                "[{\"id\":\"" + remoteId + "\",\"title\":\"T\",\"description\":\"d\","
                + "\"status\":\"resolved\",\"updatedAt\":\"2026-07-02T10:00:00Z\"}]");

        int received = sync.pullIncidents("tok", Set.of(remoteId));

        IncidentRepository.Incident row = repo.listAll().stream()
                .filter(i -> remoteId.equals(i.remoteId())).findFirst().orElseThrow();
        assertEquals("resolved", row.status(), "a clamped status must reconcile onto the pushed row");
        assertFalse(row.isDirty(), "the reconciled row must not stay dirty");
        assertEquals(0, received, "a pushed row must not count toward the pull-received notification");
    }

    @Test
    void pull_pushedRowRedirtiedOnStatus_conflictsInsteadOfClobbering() throws Exception {
        String remoteId = "redirty-" + System.nanoTime();
        IncidentRepository repo = new IncidentRepository();
        // Pushed "open" and snapshotted the base, then the user re-edits the status
        // locally before the pull runs.
        int localId = repo.insertDirty("T", "d");
        repo.assignRemoteId(localId, remoteId);
        repo.updateBase(localId, "T", "d", "open", "2026-07-01T10:00:00Z");
        repo.markSynced(localId);
        repo.updateStatusLocally(localId, "in_progress");

        // Meanwhile the server clamped the original push to "resolved".
        SyncService sync = new SyncService();
        sync.setPageFetcher((path, token) ->
                "[{\"id\":\"" + remoteId + "\",\"title\":\"T\",\"description\":\"d\","
                + "\"status\":\"resolved\",\"updatedAt\":\"2026-07-02T10:00:00Z\"}]");

        sync.pullIncidents("tok", Set.of(remoteId));

        IncidentRepository.Incident row = repo.listAll().stream()
                .filter(i -> remoteId.equals(i.remoteId())).findFirst().orElseThrow();
        assertTrue(row.isConflict(), "a re-dirtied field colliding with the server must raise a conflict");
        assertEquals("in_progress", row.status(), "the local edit must not be clobbered");
        assertEquals("resolved", row.remoteStatus(), "the server value is kept for the user to resolve");
    }

    @Test
    void deltaPull_neverTombstones() throws Exception {
        String local = "delta-kept-" + System.nanoTime();
        IncidentRepository repo = new IncidentRepository();
        repo.upsertFromServer(local, "kept", "d", "open", serverTs());

        List<String> captured = new ArrayList<>();
        SyncService sync = new SyncService();
        // Seed a previous pull timestamp so this becomes an incremental pull.
        sync.setLastPullTimestampForTest("2026-07-01T00:00:00.000Z");
        sync.setPageFetcher((path, token) -> {
            captured.add(path);
            return "[]"; // nothing changed since
        });

        sync.pullIncidents("tok", Collections.emptySet());

        boolean stillPresent = repo.listAll().stream()
                .anyMatch(i -> local.equals(i.remoteId()));
        assertTrue(stillPresent,
                "an incremental pull must never tombstone local incidents");
        assertTrue(captured.get(0).contains("since="),
                "an incremental pull must send the since parameter");
        assertTrue(captured.get(0).contains("page=1"),
                "the pull must be paginated");
    }
}
