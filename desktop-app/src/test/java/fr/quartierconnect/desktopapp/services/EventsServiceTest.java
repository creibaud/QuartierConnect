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
                new EventsService.EventSummary("id-1", "Neighborhood party", "2026-06-21T18:00:00Z", "Market square");
        assertEquals("id-1", summary.id());
        assertEquals("Neighborhood party", summary.title());
        assertEquals("2026-06-21T18:00:00Z", summary.date());
        assertEquals("Market square", summary.location());
    }

    @Test
    void eventSummary_nullLocation_allowed() {
        EventsService.EventSummary summary =
                new EventsService.EventSummary("id-2", "Meeting", "2026-07-01T10:00:00Z", null);
        assertNull(summary.location());
    }

    @Test
    void eventSummary_equality_byValue() {
        EventsService.EventSummary a =
                new EventsService.EventSummary("id-1", "Party", "2026-06-21T18:00:00Z", null);
        EventsService.EventSummary b =
                new EventsService.EventSummary("id-1", "Party", "2026-06-21T18:00:00Z", null);
        assertEquals(a, b);
    }
}
