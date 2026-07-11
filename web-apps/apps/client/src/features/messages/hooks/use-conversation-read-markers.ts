import { useCallback, useState } from "react";

const READ_MARKERS_STORAGE_KEY = "quartierconnect.messages.readMarkers";

function loadReadMarkers(): Record<string, string> {
    try {
        const raw = localStorage.getItem(READ_MARKERS_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
        return {};
    }
}

export function useConversationReadMarkers() {
    const [readMarkers, setReadMarkers] =
        useState<Record<string, string>>(loadReadMarkers);

    const markConversationRead = useCallback(
        (conversationId: string, readAt: string) => {
            setReadMarkers((previous) => {
                const existing = previous[conversationId];
                if (existing && Date.parse(existing) >= Date.parse(readAt)) {
                    return previous;
                }
                const next = { ...previous, [conversationId]: readAt };
                try {
                    localStorage.setItem(
                        READ_MARKERS_STORAGE_KEY,
                        JSON.stringify(next),
                    );
                } catch {
                    // localStorage unavailable — markers last for the session
                }
                return next;
            });
        },
        [],
    );

    return { readMarkers, markConversationRead };
}
