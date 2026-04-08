package fr.quartierconnect.desktopapp.services;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class NeighborhoodsServiceTest {

    @Test
    void fetchNeighborhoods_withoutToken_returnsEmptyList() {
        NeighborhoodsService service = new NeighborhoodsService();
        List<NeighborhoodsService.NeighborhoodSummary> result = service.fetchNeighborhoods();
        assertNotNull(result);
        assertTrue(result.isEmpty(), "No auth token → empty list");
    }

    @Test
    void neighborhoodSummary_record_fieldsAccessible() {
        NeighborhoodsService.NeighborhoodSummary summary =
                new NeighborhoodsService.NeighborhoodSummary("id-1", "Belleville");
        assertEquals("id-1", summary.id());
        assertEquals("Belleville", summary.name());
    }

    @Test
    void neighborhoodSummary_equality_byValue() {
        NeighborhoodsService.NeighborhoodSummary a =
                new NeighborhoodsService.NeighborhoodSummary("id-1", "Belleville");
        NeighborhoodsService.NeighborhoodSummary b =
                new NeighborhoodsService.NeighborhoodSummary("id-1", "Belleville");
        assertEquals(a, b);
    }
}
