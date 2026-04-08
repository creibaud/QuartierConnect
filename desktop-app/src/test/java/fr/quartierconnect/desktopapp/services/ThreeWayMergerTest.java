package fr.quartierconnect.desktopapp.services;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ThreeWayMergerTest {

    private final ThreeWayMerger merger = new ThreeWayMerger();

    private ThreeWayMerger.Snapshot snap(String title, String desc, String status) {
        return new ThreeWayMerger.Snapshot(title, desc, status);
    }

    @Test
    void noAncestor_returnsRemoteClean() {
        ThreeWayMerger.MergeResult result = merger.merge(
                null,
                snap("local title", "local desc", "open"),
                snap("remote title", "remote desc", "in_progress")
        );

        assertEquals("remote title", result.title());
        assertEquals("remote desc", result.description());
        assertEquals("in_progress", result.status());
        assertFalse(result.hasConflict());
    }

    @Test
    void noChangesOnEitherSide_returnsLocalClean() {
        ThreeWayMerger.Snapshot base = snap("title", "desc", "open");

        ThreeWayMerger.MergeResult result = merger.merge(base, base, base);

        assertEquals("title", result.title());
        assertFalse(result.hasConflict());
    }

    @Test
    void onlyLocalChanged_keepsLocal() {
        ThreeWayMerger.Snapshot base   = snap("original", "desc", "open");
        ThreeWayMerger.Snapshot local  = snap("edited locally", "desc", "open");
        ThreeWayMerger.Snapshot remote = snap("original", "desc", "open");

        ThreeWayMerger.MergeResult result = merger.merge(base, local, remote);

        assertEquals("edited locally", result.title());
        assertFalse(result.hasConflict());
    }

    @Test
    void onlyRemoteChanged_takesRemote() {
        ThreeWayMerger.Snapshot base   = snap("original", "desc", "open");
        ThreeWayMerger.Snapshot local  = snap("original", "desc", "open");
        ThreeWayMerger.Snapshot remote = snap("original", "updated on server", "in_progress");

        ThreeWayMerger.MergeResult result = merger.merge(base, local, remote);

        assertEquals("updated on server", result.description());
        assertEquals("in_progress", result.status());
        assertFalse(result.hasConflict());
    }

    @Test
    void bothSameChange_autoMergesClean() {
        ThreeWayMerger.Snapshot base   = snap("original", "desc", "open");
        ThreeWayMerger.Snapshot local  = snap("same edit", "desc", "open");
        ThreeWayMerger.Snapshot remote = snap("same edit", "desc", "open");

        ThreeWayMerger.MergeResult result = merger.merge(base, local, remote);

        assertEquals("same edit", result.title());
        assertFalse(result.hasConflict());
    }

    @Test
    void bothDifferentChanges_flagsConflict() {
        ThreeWayMerger.Snapshot base   = snap("original", "desc", "open");
        ThreeWayMerger.Snapshot local  = snap("local edit", "desc", "open");
        ThreeWayMerger.Snapshot remote = snap("remote edit", "desc", "open");

        ThreeWayMerger.MergeResult result = merger.merge(base, local, remote);

        assertTrue(result.hasConflict());
        assertTrue(result.conflictFields().contains("title"));
        assertFalse(result.conflictFields().contains("description"));
        assertFalse(result.conflictFields().contains("status"));
    }
}
