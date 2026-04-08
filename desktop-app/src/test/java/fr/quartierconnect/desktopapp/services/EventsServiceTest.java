package fr.quartierconnect.desktopapp.services;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class EventsServiceTest {

    @Test
    void fetchEvents_withoutToken_returnsEmptyList() {
        EventsService service = new EventsService();
        List<EventsService.EventSummary> result = service.fetchEvents();
        assertNotNull(result);
        assertTrue(result.isEmpty(), "No auth token → empty list");
    }

    @Test
    void eventSummary_record_fieldsAccessible() {
        EventsService.EventSummary summary =
                new EventsService.EventSummary("id-1", "Fête de quartier", "2026-06-21T18:00:00Z", "Place du marché");
        assertEquals("id-1", summary.id());
        assertEquals("Fête de quartier", summary.title());
        assertEquals("2026-06-21T18:00:00Z", summary.date());
        assertEquals("Place du marché", summary.location());
    }

    @Test
    void eventSummary_nullLocation_allowed() {
        EventsService.EventSummary summary =
                new EventsService.EventSummary("id-2", "Réunion", "2026-07-01T10:00:00Z", null);
        assertNull(summary.location());
    }

    @Test
    void eventSummary_equality_byValue() {
        EventsService.EventSummary a =
                new EventsService.EventSummary("id-1", "Fête", "2026-06-21T18:00:00Z", null);
        EventsService.EventSummary b =
                new EventsService.EventSummary("id-1", "Fête", "2026-06-21T18:00:00Z", null);
        assertEquals(a, b);
    }
}
