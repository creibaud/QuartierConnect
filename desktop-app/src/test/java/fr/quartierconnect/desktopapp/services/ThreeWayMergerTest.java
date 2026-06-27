package fr.quartierconnect.desktopapp.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ThreeWayMergerTest {

    private ThreeWayMerger merger;

    private static ThreeWayMerger.Snapshot snap(String title, String desc, String status) {
        return new ThreeWayMerger.Snapshot(title, desc, status);
    }

    @BeforeEach
    void setUp() { merger = new ThreeWayMerger(); }

    // ── LWW fallback (null base = first sync) ─────────────────────────────────

    @Nested
    class LwwFallback {

        @Test
        void nullBase_alwaysTakesRemoteClean() {
            var result = merger.merge(null,
                    snap("local title", "local desc", "open"),
                    snap("remote title", "remote desc", "in_progress"));

            assertEquals("remote title",   result.title());
            assertEquals("remote desc",    result.description());
            assertEquals("in_progress",    result.status());
            assertFalse(result.hasConflict());
            assertTrue(result.conflictFields().isEmpty());
        }

        @Test
        void nullBase_remoteEmpty_takesRemoteEmptyValues() {
            var result = merger.merge(null,
                    snap("local", "desc", "open"),
                    snap("", "", "resolved"));

            assertEquals("",        result.title());
            assertEquals("",        result.description());
            assertEquals("resolved", result.status());
            assertFalse(result.hasConflict());
        }
    }

    // ── No changes ────────────────────────────────────────────────────────────

    @Nested
    class NoChanges {

        @Test
        void identicalSnapshots_returnsBaseClean() {
            var base = snap("Titre", "Desc", "open");
            var result = merger.merge(base, base, base);

            assertEquals("Titre", result.title());
            assertEquals("Desc",  result.description());
            assertEquals("open",  result.status());
            assertEquals(ThreeWayMerger.Outcome.CLEAN, result.outcome());
            assertTrue(result.conflictFields().isEmpty());
        }

        @Test
        void noChangesAnyField_cleanMerge() {
            var base   = snap("T", "D", "in_progress");
            var local  = snap("T", "D", "in_progress");
            var remote = snap("T", "D", "in_progress");

            var result = merger.merge(base, local, remote);

            assertFalse(result.hasConflict());
        }
    }

    // ── Only local changed ────────────────────────────────────────────────────

    @Nested
    class OnlyLocalChanged {

        @Test
        void localChangedTitle_keepsLocalTitle() {
            var base   = snap("Titre original", "D", "open");
            var local  = snap("Modified title",  "D", "open");
            var remote = snap("Titre original", "D", "open");

            var result = merger.merge(base, local, remote);

            assertEquals("Modified title", result.title());
            assertFalse(result.hasConflict());
        }

        @Test
        void localChangedStatus_keepsLocalStatus() {
            var base   = snap("T", "D", "open");
            var local  = snap("T", "D", "in_progress");
            var remote = snap("T", "D", "open");

            var result = merger.merge(base, local, remote);

            assertEquals("in_progress", result.status());
            assertFalse(result.hasConflict());
        }

        @Test
        void localChangedAllFields_keepsAllLocalValues() {
            var base   = snap("T",  "D",  "open");
            var local  = snap("T2", "D2", "in_progress");
            var remote = snap("T",  "D",  "open");

            var result = merger.merge(base, local, remote);

            assertEquals("T2", result.title());
            assertEquals("D2", result.description());
            assertEquals("in_progress", result.status());
            assertFalse(result.hasConflict());
        }

        @Test
        void localResolvedIncident_keepsResolved() {
            var base   = snap("T", "D", "in_progress");
            var local  = snap("T", "D", "resolved");
            var remote = snap("T", "D", "in_progress");

            var result = merger.merge(base, local, remote);

            assertEquals("resolved", result.status());
            assertFalse(result.hasConflict());
        }
    }

    // ── Only remote changed ───────────────────────────────────────────────────

    @Nested
    class OnlyRemoteChanged {

        @Test
        void remoteChangedTitle_keepsRemoteTitle() {
            var base   = snap("Titre",        "D", "open");
            var local  = snap("Titre",        "D", "open");
            var remote = snap("Titre serveur","D", "open");

            var result = merger.merge(base, local, remote);

            assertEquals("Titre serveur", result.title());
            assertFalse(result.hasConflict());
        }

        @Test
        void remoteChangedDescription_keepsRemoteDescription() {
            var base   = snap("T", "Desc",        "open");
            var local  = snap("T", "Desc",        "open");
            var remote = snap("T", "Desc serveur","open");

            var result = merger.merge(base, local, remote);

            assertEquals("Desc serveur", result.description());
            assertFalse(result.hasConflict());
        }

        @Test
        void remoteResolvedIncident_keepsRemoteResolved() {
            var base   = snap("T", "D", "in_progress");
            var local  = snap("T", "D", "in_progress");
            var remote = snap("T", "D", "resolved");

            var result = merger.merge(base, local, remote);

            assertEquals("resolved", result.status());
            assertFalse(result.hasConflict());
        }

        @Test
        void remoteChangedTwoFields_keepsBothRemoteValues() {
            var base   = snap("T",  "D",       "open");
            var local  = snap("T",  "D",       "open");
            var remote = snap("T2", "D serveur","open");

            var result = merger.merge(base, local, remote);

            assertEquals("T2",        result.title());
            assertEquals("D serveur", result.description());
            assertFalse(result.hasConflict());
        }
    }

    // ── Both sides same change ────────────────────────────────────────────────

    @Nested
    class BothSideSameChange {

        @Test
        void sameEdit_cleanMerge() {
            var base   = snap("T",    "D", "open");
            var local  = snap("Edit", "D", "open");
            var remote = snap("Edit", "D", "open");

            var result = merger.merge(base, local, remote);

            assertEquals("Edit", result.title());
            assertFalse(result.hasConflict());
        }

        @Test
        void sameStatusChange_cleanMerge() {
            var base   = snap("T", "D", "open");
            var local  = snap("T", "D", "resolved");
            var remote = snap("T", "D", "resolved");

            var result = merger.merge(base, local, remote);

            assertEquals("resolved", result.status());
            assertFalse(result.hasConflict());
        }

        @Test
        void sameEditAllFields_cleanMerge() {
            var base   = snap("T",  "D",  "open");
            var local  = snap("T2", "D2", "resolved");
            var remote = snap("T2", "D2", "resolved");

            var result = merger.merge(base, local, remote);

            assertFalse(result.hasConflict());
            assertEquals("T2",       result.title());
            assertEquals("D2",       result.description());
            assertEquals("resolved", result.status());
        }
    }

    // ── True conflicts ────────────────────────────────────────────────────────

    @Nested
    class TrueConflicts {

        @Test
        void titleConflict_reportsOnlyTitle() {
            var base   = snap("Base",   "D", "open");
            var local  = snap("Local",  "D", "open");
            var remote = snap("Remote", "D", "open");

            var result = merger.merge(base, local, remote);

            assertTrue(result.hasConflict());
            assertTrue(result.conflictFields().contains("title"),    "title should conflict");
            assertFalse(result.conflictFields().contains("description"), "description should not conflict");
            assertFalse(result.conflictFields().contains("status"),      "status should not conflict");
        }

        @Test
        void statusConflict_reportsOnlyStatus() {
            var base   = snap("T", "D", "open");
            var local  = snap("T", "D", "in_progress");
            var remote = snap("T", "D", "resolved");

            var result = merger.merge(base, local, remote);

            assertTrue(result.hasConflict());
            assertTrue(result.conflictFields().contains("status"));
            assertFalse(result.conflictFields().contains("title"));
            assertFalse(result.conflictFields().contains("description"));
        }

        @Test
        void descriptionConflict_reportsOnlyDescription() {
            var base   = snap("T", "Base",   "open");
            var local  = snap("T", "Local",  "open");
            var remote = snap("T", "Remote", "open");

            var result = merger.merge(base, local, remote);

            assertTrue(result.hasConflict());
            assertTrue(result.conflictFields().contains("description"));
            assertFalse(result.conflictFields().contains("title"));
        }

        @Test
        void allFieldsConflict_reportsAllThree() {
            var base   = snap("T",  "D",  "open");
            var local  = snap("TL", "DL", "in_progress");
            var remote = snap("TR", "DR", "resolved");

            var result = merger.merge(base, local, remote);

            assertTrue(result.hasConflict());
            assertEquals(3, result.conflictFields().size());
            assertTrue(result.conflictFields().contains("title"));
            assertTrue(result.conflictFields().contains("description"));
            assertTrue(result.conflictFields().contains("status"));
        }

        @Test
        void partialConflict_onlyConflictingFieldReported() {
            var base   = snap("T", "Base",   "open");
            var local  = snap("T", "Local",  "in_progress");
            var remote = snap("T", "Remote", "in_progress");

            var result = merger.merge(base, local, remote);

            assertTrue(result.hasConflict());
            assertTrue(result.conflictFields().contains("description"));
            assertFalse(result.conflictFields().contains("title"),  "title unchanged — no conflict");
            assertFalse(result.conflictFields().contains("status"), "status same change — no conflict");
        }

        @Test
        void conflict_localValuePreservedInResult() {
            var base   = snap("Base",   "D", "open");
            var local  = snap("Local",  "D", "open");
            var remote = snap("Remote", "D", "open");

            var result = merger.merge(base, local, remote);

            assertEquals("Local", result.title(), "local value is kept in conflict pending resolution");
        }

        @Test
        void conflictFields_listIsImmutable() {
            var base   = snap("T", "D", "open");
            var local  = snap("TL","D", "open");
            var remote = snap("TR","D", "open");

            var result = merger.merge(base, local, remote);

            assertThrows(UnsupportedOperationException.class,
                    () -> result.conflictFields().add("extra"));
        }
    }

    // ── Null field handling ───────────────────────────────────────────────────

    @Nested
    class NullFields {

        @Test
        void nullDescriptionUnchanged_remoteUpdates_takesRemote() {
            var base   = snap("T", null, "open");
            var local  = snap("T", null, "open");
            var remote = snap("T", "Nouvelle desc", "open");

            var result = merger.merge(base, local, remote);

            assertEquals("Nouvelle desc", result.description());
            assertFalse(result.hasConflict());
        }

        @Test
        void localClearsDescription_remoteUnchanged_localWins() {
            var base   = snap("T", "Desc", "open");
            var local  = snap("T", null,   "open");
            var remote = snap("T", "Desc", "open");

            var result = merger.merge(base, local, remote);

            assertNull(result.description());
            assertFalse(result.hasConflict());
        }

        @Test
        void bothClearDescription_noConflict() {
            var base   = snap("T", "Desc", "open");
            var local  = snap("T", null,   "open");
            var remote = snap("T", null,   "open");

            var result = merger.merge(base, local, remote);

            assertNull(result.description());
            assertFalse(result.hasConflict());
        }

        @Test
        void localSetsNullRemoteSetsDifferent_conflict() {
            var base   = snap("T", "Orig", "open");
            var local  = snap("T", null,   "open");
            var remote = snap("T", "New",  "open");

            var result = merger.merge(base, local, remote);

            assertTrue(result.hasConflict());
            assertTrue(result.conflictFields().contains("description"));
        }
    }

    // ── MergeResult record ────────────────────────────────────────────────────

    @Nested
    class MergeResultRecord {

        @Test
        void cleanResult_hasConflictReturnsFalse() {
            var base   = snap("T", "D", "open");
            var local  = snap("T2","D", "open");
            var remote = snap("T", "D", "open");

            assertFalse(merger.merge(base, local, remote).hasConflict());
        }

        @Test
        void conflictResult_hasConflictReturnsTrue() {
            var base   = snap("T","D","open");
            var local  = snap("TL","D","open");
            var remote = snap("TR","D","open");

            assertTrue(merger.merge(base, local, remote).hasConflict());
        }

        @Test
        void outcomeEnum_cleanAndConflictValues() {
            assertEquals(2, ThreeWayMerger.Outcome.values().length);
        }
    }
}
