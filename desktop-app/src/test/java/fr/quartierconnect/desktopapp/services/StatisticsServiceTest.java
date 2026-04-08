package fr.quartierconnect.desktopapp.services;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests StatisticsService logic in isolation.
 * DB-dependent paths are covered by SyncServiceTest (shared in-memory DB).
 * Here we verify Stats record invariants and remote-null behaviour without a live DB.
 */
class StatisticsServiceTest {

    @Test
    void stats_record_invariant_dirtyPlusSyncedEqualsTotal() {
        StatisticsService.Stats stats = new StatisticsService.Stats(
                10, 3, 7,
                5, 3, 2,
                null, null, null, null
        );

        assertEquals(10, stats.localTotal());
        assertEquals(stats.localDirty() + stats.localSynced(), stats.localTotal());
        assertEquals(stats.localOpen() + stats.localInProgress() + stats.localResolved(), stats.localTotal());
    }

    @Test
    void stats_allZero_valid() {
        StatisticsService.Stats stats = new StatisticsService.Stats(
                0, 0, 0, 0, 0, 0, null, null, null, null
        );
        assertEquals(0, stats.localTotal());
        assertNull(stats.remoteUsers());
    }

    @Test
    void stats_withRemoteValues_notNull() {
        StatisticsService.Stats stats = new StatisticsService.Stats(
                5, 2, 3, 4, 1, 0,
                42, 17, 5, 8
        );
        assertEquals(42, stats.remoteUsers());
        assertEquals(17, stats.remoteIncidents());
        assertEquals(5, stats.remoteNeighborhoods());
        assertEquals(8, stats.remoteActiveIncidents());
    }

    @Test
    void computeStats_withoutToken_remoteStatsAreNull() {
        StatisticsService service = new StatisticsService();
        StatisticsService.Stats stats = service.computeStats();

        assertNull(stats.remoteUsers(), "No auth token → remote stats null");
        assertNull(stats.remoteIncidents());
        assertNull(stats.remoteNeighborhoods());
        assertNull(stats.remoteActiveIncidents());
    }

    @Test
    void computeStats_localCountsNonNegative() {
        StatisticsService service = new StatisticsService();
        StatisticsService.Stats stats = service.computeStats();

        assertTrue(stats.localTotal() >= 0);
        assertTrue(stats.localDirty() >= 0);
        assertTrue(stats.localSynced() >= 0);
        assertTrue(stats.localOpen() >= 0);
        assertTrue(stats.localInProgress() >= 0);
        assertTrue(stats.localResolved() >= 0);
    }
}
