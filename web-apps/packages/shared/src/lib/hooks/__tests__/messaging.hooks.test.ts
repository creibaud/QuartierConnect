import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api";
import { disconnectRealtimeSocket } from "../../realtime";
import {
    useConversations,
    useCreateConversation,
    useMessages,
    useSocketMessages,
} from "../useMessaging";

// vi.hoisted ensures the factory runs before module imports (required by Vitest).
const { mockSocket, mockIo, mockEmitWithAck } = vi.hoisted(() => {
    const mockEmitWithAck = vi.fn();
    const mockSocket = {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
        timeout: vi.fn(() => ({ emitWithAck: mockEmitWithAck })),
        disconnect: vi.fn(),
        connected: true,
    };
    const mockIo = vi.fn(() => mockSocket);
    return { mockSocket, mockIo, mockEmitWithAck };
});

vi.mock("socket.io-client", () => ({ io: mockIo }));

vi.mock("../../api", () => ({
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiUpload: vi.fn(),
}));
vi.mock("../../auth", () => ({
    getAccessToken: vi.fn(() => "mock-access-token"),
}));

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockConversation = {
    _id: "conv-1",
    participants: ["user-1", "user-2"],
    isGroup: false,
    createdAt: "2026-01-01T00:00:00Z",
};

const mockMessage = {
    _id: "msg-1",
    conversationId: "conv-1",
    senderId: "user-1",
    content: "Hello",
    type: "text",
    createdAt: "2026-01-01T00:00:00Z",
};

describe("useConversations", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns fetched conversations", async () => {
        vi.mocked(api.apiGet).mockResolvedValue([mockConversation]);
        const { result } = renderHook(() => useConversations(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockConversation]);
    });

    it("enters error state on API failure", async () => {
        vi.mocked(api.apiGet).mockRejectedValue(new Error("Network error"));
        const { result } = renderHook(() => useConversations(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe("useCreateConversation", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls apiPost with participants", async () => {
        vi.mocked(api.apiPost).mockResolvedValue(mockConversation);
        const { result } = renderHook(() => useCreateConversation(), {
            wrapper: createWrapper(),
        });
        await act(async () => {
            await result.current.mutateAsync({ participants: ["user-2"] });
        });
        expect(api.apiPost).toHaveBeenCalledWith("/messaging/conversations", {
            participants: ["user-2"],
        });
    });

    it("surfaces mutation error", async () => {
        vi.mocked(api.apiPost).mockRejectedValue(new Error("Forbidden"));
        const { result } = renderHook(() => useCreateConversation(), {
            wrapper: createWrapper(),
        });
        await act(async () => {
            await result.current
                .mutateAsync({ participants: ["user-x"] })
                .catch(() => {});
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe("useMessages", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches messages for a conversation", async () => {
        vi.mocked(api.apiGet).mockResolvedValue([mockMessage]);
        const { result } = renderHook(() => useMessages("conv-1"), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockMessage]);
        expect(api.apiGet).toHaveBeenCalledWith(
            "/messaging/conversations/conv-1/messages?page=1",
        );
    });

    it("is disabled when conversationId is empty", () => {
        const { result } = renderHook(() => useMessages(""), {
            wrapper: createWrapper(),
        });
        expect(result.current.fetchStatus).toBe("idle");
    });
});

describe("useSocketMessages", () => {
    beforeEach(() => {
        disconnectRealtimeSocket();
        vi.clearAllMocks();
        mockSocket.connected = true;
        mockIo.mockReturnValue(mockSocket);
    });

    it("connects to /messaging namespace with the access token", () => {
        const onMessage = vi.fn();
        renderHook(() => useSocketMessages("conv-1", onMessage), {
            wrapper: createWrapper(),
        });

        expect(mockIo).toHaveBeenCalledWith(
            expect.stringContaining("/messaging"),
            expect.objectContaining({ auth: expect.any(Function) }),
        );
        const [, ioOptions] = mockIo.mock.calls[0] as unknown as [
            string,
            { auth: (provideAuth: (data: object) => void) => void },
        ];
        const provideAuth = vi.fn();
        ioOptions.auth(provideAuth);
        expect(provideAuth).toHaveBeenCalledWith({
            token: "mock-access-token",
        });
    });

    it("reuses a single shared connection across hooks", () => {
        renderHook(() => useSocketMessages("conv-1", vi.fn()), {
            wrapper: createWrapper(),
        });
        renderHook(() => useSocketMessages("conv-2", vi.fn()), {
            wrapper: createWrapper(),
        });

        expect(mockIo).toHaveBeenCalledTimes(1);
    });

    it("emits join_conversation immediately when already connected", () => {
        mockSocket.connected = true;
        renderHook(() => useSocketMessages("conv-1", vi.fn()), {
            wrapper: createWrapper(),
        });

        expect(mockSocket.emit).toHaveBeenCalledWith(
            "join_conversation",
            "conv-1",
        );
    });

    it("emits join_conversation on connect", () => {
        mockSocket.connected = false;
        const onMessage = vi.fn();
        renderHook(() => useSocketMessages("conv-1", onMessage), {
            wrapper: createWrapper(),
        });

        const connectHandler = mockSocket.on.mock.calls.find(
            ([event]) => event === "connect",
        )?.[1];
        connectHandler?.();

        expect(mockSocket.emit).toHaveBeenCalledWith(
            "join_conversation",
            "conv-1",
        );
    });

    it("calls onMessage when new_message event fires", () => {
        const onMessage = vi.fn();
        renderHook(() => useSocketMessages("conv-1", onMessage), {
            wrapper: createWrapper(),
        });

        const newMessageHandler = mockSocket.on.mock.calls.find(
            ([event]) => event === "new_message",
        )?.[1];
        newMessageHandler?.(mockMessage);

        expect(onMessage).toHaveBeenCalledWith(mockMessage);
    });

    it("ignores new_message events from other conversations", () => {
        const onMessage = vi.fn();
        renderHook(() => useSocketMessages("conv-1", onMessage), {
            wrapper: createWrapper(),
        });

        const newMessageHandler = mockSocket.on.mock.calls.find(
            ([event]) => event === "new_message",
        )?.[1];
        newMessageHandler?.({ ...mockMessage, conversationId: "conv-other" });

        expect(onMessage).not.toHaveBeenCalled();
    });

    it("sendMessage awaits the server ack and resolves with the message", async () => {
        const onMessage = vi.fn();
        mockEmitWithAck.mockResolvedValueOnce(mockMessage);
        const { result } = renderHook(
            () => useSocketMessages("conv-1", onMessage),
            { wrapper: createWrapper() },
        );

        await act(async () => {
            await expect(
                result.current.sendMessage("Hello world"),
            ).resolves.toEqual(mockMessage);
        });

        expect(mockSocket.timeout).toHaveBeenCalledWith(5000);
        expect(mockEmitWithAck).toHaveBeenCalledWith("send_message", {
            conversationId: "conv-1",
            content: "Hello world",
        });
    });

    it("sendMessage rejects when the ack never arrives", async () => {
        const onMessage = vi.fn();
        mockEmitWithAck.mockRejectedValueOnce(new Error("timeout"));
        const { result } = renderHook(
            () => useSocketMessages("conv-1", onMessage),
            { wrapper: createWrapper() },
        );

        await act(async () => {
            await expect(
                result.current.sendMessage("Hello world"),
            ).rejects.toThrow("timeout");
        });
    });

    it("sendMessage rejects immediately when the socket is disconnected", async () => {
        const onMessage = vi.fn();
        mockSocket.connected = false;
        const { result } = renderHook(
            () => useSocketMessages("conv-1", onMessage),
            { wrapper: createWrapper() },
        );

        await act(async () => {
            await expect(
                result.current.sendMessage("Hello world"),
            ).rejects.toThrow("socket disconnected");
        });
        mockSocket.connected = true;

        expect(mockEmitWithAck).not.toHaveBeenCalled();
    });

    it("removes its listeners but keeps the shared socket on unmount", () => {
        const onMessage = vi.fn();
        const { unmount } = renderHook(
            () => useSocketMessages("conv-1", onMessage),
            { wrapper: createWrapper() },
        );

        unmount();

        expect(mockSocket.off).toHaveBeenCalledWith(
            "new_message",
            expect.any(Function),
        );
        expect(mockSocket.off).toHaveBeenCalledWith(
            "connect",
            expect.any(Function),
        );
        expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it("does not connect when conversationId is empty", () => {
        mockIo.mockClear();
        const onMessage = vi.fn();
        renderHook(() => useSocketMessages("", onMessage), {
            wrapper: createWrapper(),
        });
        expect(mockIo).not.toHaveBeenCalled();
    });
});
