import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@workspace/shared/lib/api";
import type { CommunityVote } from "../lib/vote.types";

export interface CastVotePayload {
    choices: string[];
    weights?: Record<string, number>;
}

export function useCommunityVotes() {
    return useQuery<CommunityVote[]>({
        queryKey: ["community-votes"],
        queryFn: () => apiGet<CommunityVote[]>("/community-votes"),
    });
}

export function useVoteResults(voteId: string, enabled: boolean) {
    return useQuery({
        queryKey: ["community-votes", voteId, "results"],
        queryFn: () =>
            apiGet<Record<string, unknown>>(
                `/community-votes/${voteId}/results`,
            ),
        enabled,
    });
}

export function useCastCommunityVote(voteId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CastVotePayload) =>
            apiPost(`/community-votes/${voteId}/cast`, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["community-votes"],
            });
        },
    });
}
