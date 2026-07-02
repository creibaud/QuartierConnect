import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
    connectRealtimeSocket,
    disconnectRealtimeSocket,
} from "@workspace/shared/lib/realtime";
import {
    handleRealtimeNotification,
    type RealtimeNotification,
} from "./notifications";
import { NO_TYPING_USERS, RealtimeContext } from "./realtime-context";

interface PresenceSnapshot {
    onlineUserIds: string[];
}

interface PresenceUpdate {
    userId: string;
    online: boolean;
}

interface TypingUpdate {
    conversationId: string;
    userId: string;
    typing: boolean;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [onlineUserIds, setOnlineUserIds] = useState<ReadonlySet<string>>(
        new Set(),
    );
    const [typingUserIdsByConversation, setTypingUserIdsByConversation] =
        useState<Record<string, readonly string[]>>({});

    useEffect(() => {
        connectRealtimeSocket();
        return () => disconnectRealtimeSocket();
    }, []);

    useEffect(() => {
        const socket = connectRealtimeSocket();

        const handlePresenceSnapshot = (snapshot: PresenceSnapshot) => {
            setOnlineUserIds(new Set(snapshot.onlineUserIds));
        };

        const handlePresenceUpdate = ({ userId, online }: PresenceUpdate) => {
            setOnlineUserIds((previous) => {
                const next = new Set(previous);
                if (online) next.add(userId);
                else next.delete(userId);
                return next;
            });
            if (!online) {
                setTypingUserIdsByConversation((previous) =>
                    withoutTypingUser(previous, userId),
                );
            }
        };

        const handleTypingUpdate = ({
            conversationId,
            userId,
            typing,
        }: TypingUpdate) => {
            setTypingUserIdsByConversation((previous) =>
                withTypingUpdate(previous, conversationId, userId, typing),
            );
        };

        const handleNotification = (notification: RealtimeNotification) => {
            handleRealtimeNotification(notification, { t, queryClient });
        };

        const handleNewMessage = () => {
            void queryClient.invalidateQueries({
                queryKey: ["conversations"],
            });
        };

        const handleDisconnect = () => {
            setOnlineUserIds(new Set());
            setTypingUserIdsByConversation({});
        };

        socket.on("presence:snapshot", handlePresenceSnapshot);
        socket.on("presence:update", handlePresenceUpdate);
        socket.on("typing:update", handleTypingUpdate);
        socket.on("notification", handleNotification);
        socket.on("new_message", handleNewMessage);
        socket.on("disconnect", handleDisconnect);

        return () => {
            socket.off("presence:snapshot", handlePresenceSnapshot);
            socket.off("presence:update", handlePresenceUpdate);
            socket.off("typing:update", handleTypingUpdate);
            socket.off("notification", handleNotification);
            socket.off("new_message", handleNewMessage);
            socket.off("disconnect", handleDisconnect);
        };
    }, [queryClient, t]);

    const value = useMemo(
        () => ({ onlineUserIds, typingUserIdsByConversation }),
        [onlineUserIds, typingUserIdsByConversation],
    );

    return (
        <RealtimeContext.Provider value={value}>
            {children}
        </RealtimeContext.Provider>
    );
}

function withTypingUpdate(
    previous: Record<string, readonly string[]>,
    conversationId: string,
    userId: string,
    typing: boolean,
): Record<string, readonly string[]> {
    const current = previous[conversationId] ?? NO_TYPING_USERS;
    if (typing) {
        if (current.includes(userId)) return previous;
        return { ...previous, [conversationId]: [...current, userId] };
    }
    if (!current.includes(userId)) return previous;
    const remaining = current.filter((id) => id !== userId);
    if (remaining.length > 0) {
        return { ...previous, [conversationId]: remaining };
    }
    const next = { ...previous };
    delete next[conversationId];
    return next;
}

function withoutTypingUser(
    previous: Record<string, readonly string[]>,
    userId: string,
): Record<string, readonly string[]> {
    let changed = false;
    const next: Record<string, readonly string[]> = {};
    for (const [conversationId, userIds] of Object.entries(previous)) {
        const remaining = userIds.filter((id) => id !== userId);
        if (remaining.length !== userIds.length) changed = true;
        if (remaining.length > 0) next[conversationId] = remaining;
    }
    return changed ? next : previous;
}
