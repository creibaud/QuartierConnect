package fr.quartierconnect.desktopapp.services;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class VotesServiceTest {

    @Test
    void vote_withoutToken_returnsFail() {
        VotesService service = new VotesService();
        VotesService.VoteResult result = service.vote("target-1", "service", "up");
        assertFalse(result.success());
        assertNotNull(result.error());
    }

    @Test
    void voteResult_ok_hasNoError() {
        VotesService.VoteResult ok = VotesService.VoteResult.ok();
        assertTrue(ok.success());
        assertNull(ok.error());
    }

    @Test
    void voteResult_fail_hasErrorMessage() {
        VotesService.VoteResult fail = VotesService.VoteResult.fail("Network error");
        assertFalse(fail.success());
        assertEquals("Network error", fail.error());
    }

    @Test
    void vote_directionNone_allowedForToggle() {
        VotesService service = new VotesService();
        VotesService.VoteResult result = service.vote("target-2", "service", "none");
        assertNotNull(result);
    }
}
