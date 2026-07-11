import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Message } from "@workspace/shared/lib/types";

export function useNewestCachedMessages(
    conversationIds: string[],
): Map<string, Message | undefined> {
    const queryClient = useQueryClient();
    const [cacheVersion, setCacheVersion] = useState(0);

    useEffect(() => {
        let disposed = false;
        let refreshScheduled = false;
        const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
            if (event.type !== "updated") return;
            if (event.query.queryKey[0] !== "messages") return;
            if (refreshScheduled) return;
            refreshScheduled = true;
            queueMicrotask(() => {
                refreshScheduled = false;
                if (!disposed) setCacheVersion((version) => version + 1);
            });
        });
        return () => {
            disposed = true;
            unsubscribe();
        };
    }, [queryClient]);

    return useMemo(() => {
        const newestById = new Map<string, Message | undefined>();
        conversationIds.forEach((id) => {
            const messages = queryClient.getQueryData<Message[]>([
                "messages",
                id,
                1,
            ]);
            newestById.set(id, messages?.[0]);
        });
        return newestById;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- cacheVersion re-reads the query cache
    }, [conversationIds, queryClient, cacheVersion]);
}
