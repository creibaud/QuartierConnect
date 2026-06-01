import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { apiGet, apiPost, apiUpload } from "../api";
import { getAccessToken } from "../auth";
import type { Conversation, Message } from "../types";

export function useConversations() {
    return useQuery<Conversation[]>({
        queryKey: ["conversations"],
        queryFn: () => apiGet<Conversation[]>("/messaging/conversations"),
    });
}

export function useCreateConversation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            participants?: string[];
            participantEmails?: string[];
            isGroup?: boolean;
            groupName?: string;
        }) => apiPost<Conversation>("/messaging/conversations", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
    });
}

export function useMessages(conversationId: string, page = 1) {
    return useQuery<Message[]>({
        queryKey: ["messages", conversationId, page],
        queryFn: () =>
            apiGet<Message[]>(
                `/messaging/conversations/${conversationId}/messages?page=${page}`,
            ),
        enabled: !!conversationId,
    });
}

export function useSendFileMessage(conversationId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (file: File) => {
            const fd = new FormData();
            fd.append("file", file);
            return apiUpload<Message>(
                `/messaging/conversations/${conversationId}/upload`,
                fd,
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["messages", conversationId],
            });
        },
    });
}

export function useSocketMessages(
    conversationId: string,
    onMessage: (msg: Message) => void,
) {
    const queryClient = useQueryClient();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!conversationId) return;

        const token = getAccessToken();
        const socket = io("/messaging", {
            path: "/api/socket.io",
            auth: { token },
            transports: ["websocket"],
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            socket.emit("join_conversation", conversationId);
        });

        socket.on("new_message", (msg: Message) => {
            onMessage(msg);
            queryClient.invalidateQueries({
                queryKey: ["messages", conversationId],
            });
        });

        return () => {
            if (socket.connected) {
                socket.emit("leave_conversation", conversationId);
            }
            socket.disconnect();
        };
    }, [conversationId, onMessage, queryClient]);

    const sendMessage = (content: string) => {
        socketRef.current?.emit("send_message", { conversationId, content });
    };

    return { sendMessage };
}
