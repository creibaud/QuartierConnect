import { createContext, useContext } from "react";

export interface RealtimeContextValue {
    onlineUserIds: ReadonlySet<string>;
    typingUserIdsByConversation: Readonly<Record<string, readonly string[]>>;
}

export const NO_TYPING_USERS: readonly string[] = [];

export const RealtimeContext = createContext<RealtimeContextValue>({
    onlineUserIds: new Set(),
    typingUserIdsByConversation: {},
});

export function useRealtime(): RealtimeContextValue {
    return useContext(RealtimeContext);
}

export function useTypingUserIds(
    conversationId: string | null,
): readonly string[] {
    const { typingUserIdsByConversation } = useRealtime();
    if (!conversationId) return NO_TYPING_USERS;
    return typingUserIdsByConversation[conversationId] ?? NO_TYPING_USERS;
}
