import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../api";
import type { VoteScore, VoteTargetType, VoteType } from "../types";

export function useVoteScore(targetId: string, targetType: VoteTargetType) {
    return useQuery<VoteScore>({
        queryKey: ["votes", targetType, targetId],
        queryFn: () =>
            apiGet<VoteScore>(
                `/votes/score?targetId=${targetId}&targetType=${targetType}`,
            ),
        enabled: !!targetId,
    });
}

export function useCastVote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            targetType: VoteTargetType;
            targetId: string;
            voteType: VoteType;
        }) =>
            apiPost<{
                action: "added" | "removed" | "changed";
                voteType: VoteType;
            }>("/votes", data),
        onSuccess: (_, { targetType, targetId }) => {
            queryClient.invalidateQueries({
                queryKey: ["votes", targetType, targetId],
            });
        },
        onError: (
            _: unknown,
            {
                targetType,
                targetId,
            }: {
                targetType: VoteTargetType;
                targetId: string;
                voteType: VoteType;
            },
        ) => {
            queryClient.invalidateQueries({
                queryKey: ["votes", targetType, targetId],
            });
        },
    });
}
