package fr.quartierconnect.desktopapp.services;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ServicesServiceTest {

    @Test
    void fetchServices_withoutToken_returnsEmptyList() {
        ServicesService service = new ServicesService();
        List<ServicesService.ServiceSummary> result = service.fetchServices();
        assertNotNull(result);
        assertTrue(result.isEmpty(), "No auth token → empty list");
    }

    @Test
    void serviceSummary_record_fieldsAccessible() {
        ServicesService.ServiceSummary summary = new ServicesService.ServiceSummary(
                "svc-1", "Jardinage", "Aide au jardin",
                "nbh-1", "Montmartre", 5, 1, "up"
        );
        assertEquals("svc-1", summary.id());
        assertEquals("Jardinage", summary.title());
        assertEquals("Aide au jardin", summary.description());
        assertEquals("nbh-1", summary.neighborhoodId());
        assertEquals("Montmartre", summary.neighborhoodName());
        assertEquals(5, summary.upvotes());
        assertEquals(1, summary.downvotes());
        assertEquals("up", summary.userVote());
    }

    @Test
    void serviceSummary_nullUserVote_allowed() {
        ServicesService.ServiceSummary summary = new ServicesService.ServiceSummary(
                "svc-2", "Covoiturage", null, null, null, 0, 0, null
        );
        assertNull(summary.userVote());
        assertNull(summary.description());
        assertNull(summary.neighborhoodName());
    }

    @Test
    void serviceSummary_equality_byValue() {
        ServicesService.ServiceSummary a = new ServicesService.ServiceSummary(
                "svc-1", "Test", null, null, null, 0, 0, null
        );
        ServicesService.ServiceSummary b = new ServicesService.ServiceSummary(
                "svc-1", "Test", null, null, null, 0, 0, null
        );
        assertEquals(a, b);
    }
}
