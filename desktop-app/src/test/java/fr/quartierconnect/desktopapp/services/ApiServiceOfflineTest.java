package fr.quartierconnect.desktopapp.services;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests de ApiService.isReachable() — la vérification de connectivité réseau utilisée
 * pour décider s'il faut tenter une connexion en ligne ou se rabattre sur le mode hors ligne.
 */
class ApiServiceOfflineTest {

    @Test
    void isReachable_returnsFalse_whenApiDoesNotExist() {
        // Pointer vers un port sur lequel rien n'écoute
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
