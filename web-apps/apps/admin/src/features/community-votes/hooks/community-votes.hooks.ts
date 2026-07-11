import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@workspace/shared/lib/api";
import type { VoteResults } from "../lib/community-vote.types";

export function useCloseVote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiPost(`/community-votes/${id}/close`, {}),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: ["admin-community-votes"],
            }),
    });
}

export function useCreateCommunityVote() {
    return useMutation({
        mutationFn: (payload: unknown) => apiPost("/community-votes", payload),
    });
}

export function useVoteResults(voteId: string) {
    return useQuery<VoteResults>({
        queryKey: ["community-vote-results", voteId],
        queryFn: async () => {
            const raw = await apiGet<{
                totals: Record<string, number>;
                totalParticipants: number;
                quorumReached: boolean;
                status: "open" | "closed";
                options: { id: string; label: string }[];
            }>(`/community-votes/${voteId}/results`);
            const total = raw.totalParticipants;
            return {
                totalVotes: total,
                quorumReached: raw.quorumReached,
                status: raw.status,
                results: raw.options.map((option) => {
                    const count = raw.totals[option.id] ?? 0;
                    return {
                        optionId: option.id,
                        label: option.label,
                        count,
                        percentage: total > 0 ? (count / total) * 100 : 0,
                    };
                }),
            };
        },
    });
}
