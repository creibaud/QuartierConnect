package fr.quartierconnect.desktopapp.services;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ContractsServiceTest {

    @Test
    void fetchContracts_withoutToken_returnsEmptyList() {
        ContractsService service = new ContractsService();
        List<ContractsService.ContractSummary> result = service.fetchContracts();
        assertNotNull(result);
        assertTrue(result.isEmpty(), "No auth token → empty list");
    }

    @Test
    void contractSummary_record_fieldsAccessible() {
        ContractsService.ContractSummary summary =
                new ContractsService.ContractSummary("id-1", "Contrat de prestation", "draft", 0, 2, true);
        assertEquals("id-1", summary.id());
        assertEquals("Contrat de prestation", summary.title());
        assertEquals("draft", summary.status());
        assertEquals(0, summary.signatureCount());
        assertEquals(2, summary.signatoryCount());
        assertTrue(summary.canSign());
    }

    @Test
    void contractSummary_fullySigned_canSignIsFalse() {
        ContractsService.ContractSummary summary =
                new ContractsService.ContractSummary("id-2", "Accord", "fully_signed", 2, 2, false);
        assertFalse(summary.canSign());
        assertEquals(summary.signatureCount(), summary.signatoryCount());
    }

    @Test
    void contractSummary_equality_byValue() {
        ContractsService.ContractSummary a =
                new ContractsService.ContractSummary("id-1", "Accord", "draft", 1, 2, true);
        ContractsService.ContractSummary b =
                new ContractsService.ContractSummary("id-1", "Accord", "draft", 1, 2, true);
        assertEquals(a, b);
    }

    @Test
    void canSign_nonSignatory_isFalse() {
        assertFalse(ContractsService.canSign("user-3", "draft", Set.of("user-1", "user-2"), Set.of()));
    }

    @Test
    void canSign_signatoryNotYetSigned_isTrue() {
        assertTrue(ContractsService.canSign("user-1", "draft", Set.of("user-1", "user-2"), Set.of("user-2")));
    }

    @Test
    void canSign_signatoryAlreadySigned_isFalse() {
        assertFalse(ContractsService.canSign("user-1", "draft", Set.of("user-1"), Set.of("user-1")));
    }

    @Test
    void canSign_cancelledContract_isFalse() {
        assertFalse(ContractsService.canSign("user-1", "cancelled", Set.of("user-1"), Set.of()));
    }

    @Test
    void canSign_fullySignedContract_isFalse() {
        assertFalse(ContractsService.canSign("user-1", "fully_signed", Set.of("user-1"), Set.of("user-1")));
    }

    @Test
    void canSign_withoutCurrentUser_isFalse() {
        assertFalse(ContractsService.canSign(null, "draft", Set.of("user-1"), Set.of()));
    }
}
