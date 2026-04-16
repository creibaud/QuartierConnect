package fr.quartierconnect.desktopapp.services;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for ApiService.isReachable() — the network connectivity check used
 * to decide whether to attempt online login or fall back to offline mode.
 */
class ApiServiceOfflineTest {

    @Test
    void isReachable_returnsFalse_whenApiDoesNotExist() {
        // Point to a port nothing is listening on
        System.setProperty("api.url", "http://localhost:19999");
        try {
            boolean result = ApiService.isReachable();
            assertFalse(result, "Should return false when connection is refused");
        } finally {
            System.clearProperty("api.url");
        }
    }

    @Test
    void isReachable_returnsFalse_whenPortUnreachable() {
        System.setProperty("api.url", "http://127.0.0.1:1");
        try {
            boolean result = ApiService.isReachable();
            assertFalse(result, "Should return false when port is unreachable");
        } finally {
            System.clearProperty("api.url");
        }
    }
}
