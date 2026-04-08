import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api";
import {
    useConversations,
    useCreateConversation,
    useMessages,
    useSocketMessages,
} from "../useMessaging";

// --- socket.io-client mock ---------------------------------------------------
// vi.hoisted ensures the factory runs before module imports (required by Vitest).
const { mockSocket, mockIo } = vi.hoisted(() => {
    const mockSocket = {
        on: vi.fn(),
        emit: vi.fn(),
        disconnect: vi.fn(),
        connected: true,
    };
    const mockIo = vi.fn(() => mockSocket);
    return { mockSocket, mockIo };
});

vi.mock("socket.io-client", () => ({ io: mockIo }));

// --- api / auth mocks --------------------------------------------------------
vi.mock("../../api", () => ({
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiUpload: vi.fn(),
}));
vi.mock("../../auth", () => ({
    getAccessToken: vi.fn(() => "mock-access-token"),
}));

// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------

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
        vi.clearAllMocks();
        // Reset mock socket state
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
            expect.objectContaining({ auth: { token: "mock-access-token" } }),
        );
    });

    it("emits join_conversation on connect", () => {
        const onMessage = vi.fn();
        renderHook(() => useSocketMessages("conv-1", onMessage), {
            wrapper: createWrapper(),
        });

        // Simulate the connect event by calling the registered handler
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

    it("sendMessage emits send_message with content", () => {
        const onMessage = vi.fn();
        const { result } = renderHook(
            () => useSocketMessages("conv-1", onMessage),
            { wrapper: createWrapper() },
        );

        act(() => {
            result.current.sendMessage("Hello world");
        });

        expect(mockSocket.emit).toHaveBeenCalledWith("send_message", {
            conversationId: "conv-1",
            content: "Hello world",
        });
    });

    it("emits leave_conversation and disconnects on unmount", () => {
        const onMessage = vi.fn();
        const { unmount } = renderHook(
            () => useSocketMessages("conv-1", onMessage),
            { wrapper: createWrapper() },
        );

        unmount();

        expect(mockSocket.emit).toHaveBeenCalledWith(
            "leave_conversation",
            "conv-1",
        );
        expect(mockSocket.disconnect).toHaveBeenCalled();
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
