import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiUpload } from "../api";
import { connectRealtimeSocket, getRealtimeSocket } from "../realtime";
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

    useEffect(() => {
        if (!conversationId) return;

        const socket = connectRealtimeSocket();

        const joinConversation = () => {
            socket.emit("join_conversation", conversationId);
        };

        const handleNewMessage = (msg: Message) => {
            if (msg.conversationId !== conversationId) return;
            onMessage(msg);
            queryClient.invalidateQueries({
                queryKey: ["messages", conversationId],
            });
        };

        if (socket.connected) joinConversation();
        socket.on("connect", joinConversation);
        socket.on("new_message", handleNewMessage);

        return () => {
            socket.off("connect", joinConversation);
            socket.off("new_message", handleNewMessage);
        };
    }, [conversationId, onMessage, queryClient]);

    // Await the ack with a timeout so a lost message surfaces as a failure.
    const SEND_ACK_TIMEOUT_MS = 5000;

    const sendMessage = (content: string): Promise<Message> => {
        const socket = getRealtimeSocket();
        if (!socket?.connected) {
            return Promise.reject(new Error("socket disconnected"));
        }
        return socket
            .timeout(SEND_ACK_TIMEOUT_MS)
            .emitWithAck("send_message", { conversationId, content });
    };

    return { sendMessage };
}
