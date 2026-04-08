package fr.quartierconnect.desktopapp.services;

import org.junit.jupiter.api.Test;

import java.util.List;

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
                new ContractsService.ContractSummary("id-1", "Contrat de prestation", "draft", 0, 2);
        assertEquals("id-1", summary.id());
        assertEquals("Contrat de prestation", summary.title());
        assertEquals("draft", summary.status());
        assertEquals(0, summary.signatureCount());
        assertEquals(2, summary.signatoryCount());
    }

    @Test
    void contractSummary_fullySigned_signatureCountEqualsSignatoryCount() {
        ContractsService.ContractSummary summary =
                new ContractsService.ContractSummary("id-2", "Accord", "signed", 2, 2);
        assertEquals(summary.signatureCount(), summary.signatoryCount());
    }

    @Test
    void contractSummary_equality_byValue() {
        ContractsService.ContractSummary a =
                new ContractsService.ContractSummary("id-1", "Accord", "draft", 1, 2);
        ContractsService.ContractSummary b =
                new ContractsService.ContractSummary("id-1", "Accord", "draft", 1, 2);
        assertEquals(a, b);
    }
}
