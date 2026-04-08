package fr.quartierconnect.desktopapp.services;

import fr.quartierconnect.desktopapp.database.SQLiteDatabase;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;

class SyncServiceTest {

    private SyncService syncService;

    @BeforeAll
    static void initDb() {
        System.setProperty("sqlite.url", "jdbc:sqlite:file:testmem?mode=memory&cache=shared");
        SQLiteDatabase.initialize();
    }

    @BeforeEach
    void setUp() {
        syncService = new SyncService();
        // Run status notifications on the calling thread (no JavaFX toolkit needed)
        syncService.setStatusDispatcher(Runnable::run);
    }

    @AfterEach
    void tearDown() {
        syncService.shutdown();
    }

    @Test
    void stop_onNotStartedService_doesNotThrow() {
        assertDoesNotThrow(() -> syncService.stop());
    }

    @Test
    void start_thenStop_doesNotThrow() {
        assertDoesNotThrow(() -> {
            syncService.start();
            syncService.stop();
        });
    }

    @Test
    void start_calledTwice_isIdempotent() {
        syncService.start();
        // Second call should be a no-op — no exception, no extra task
        assertDoesNotThrow(() -> syncService.start());
    }

    @Test
    void apiUnreachable_notifiesStatusFalse() throws InterruptedException {
        System.setProperty("api.url", "http://localhost:19999");

        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean receivedStatus = new AtomicBoolean(true);

        SyncService isolated = new SyncService();
        isolated.setStatusDispatcher(Runnable::run);
        isolated.setOnStatusChange(online -> {
            receivedStatus.set(online);
            latch.countDown();
        });

        isolated.start();
        boolean notified = latch.await(3, TimeUnit.SECONDS);
        isolated.shutdown();

        System.clearProperty("api.url");

        assertTrue(notified, "Status listener should have been called within 3 s");
        assertFalse(receivedStatus.get(), "Status should be false when API is unreachable");
    }
}
