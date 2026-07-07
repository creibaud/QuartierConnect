package fr.quartierconnect.desktopapp.services;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Tests for ApiService.isReachable(), the connectivity check that gates online vs offline. */
class ApiServiceOfflineTest {

    @Test
    void isReachable_returnsFalse_whenApiDoesNotExist() {
        // point at a port nothing listens on
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
