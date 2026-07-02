import { useCallback, useEffect, useRef } from "react";
import { getRealtimeSocket } from "@workspace/shared/lib/realtime";

const TYPING_IDLE_DELAY_MS = 2000;

export function useTypingEmitter(conversationId: string) {
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

    const stopTyping = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
        if (!isTypingRef.current) return;
        isTypingRef.current = false;
        getRealtimeSocket()?.emit("typing:stop", { conversationId });
    }, [conversationId]);

    const notifyTyping = useCallback(() => {
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            getRealtimeSocket()?.emit("typing:start", { conversationId });
        }
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(stopTyping, TYPING_IDLE_DELAY_MS);
    }, [conversationId, stopTyping]);

    useEffect(() => stopTyping, [stopTyping]);

    return { notifyTyping, stopTyping };
}
