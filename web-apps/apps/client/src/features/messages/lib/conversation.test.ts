import { describe, expect, it } from "vitest";
import type { Conversation, Message } from "@workspace/shared/lib/types";
import {
    conversationInitials,
    conversationLabel,
    isConversationUnread,
    messagePreview,
    otherParticipantIds,
} from "./conversation";

const t = ((key: string) => key) as unknown as Parameters<
    typeof conversationLabel
>[2];

function conversation(overrides: Partial<Conversation> = {}): Conversation {
    return {
        _id: "c1",
        participants: ["me", "bob"],
        isGroup: false,
        groupName: null,
        neighborhoodId: null,
        lastMessageAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        unreadCount: 0,
        ...overrides,
    };
}

function message(overrides: Partial<Message> = {}): Message {
    return {
        _id: "m1",
        conversationId: "c1",
        senderId: "bob",
        type: "text",
        content: "hi",
        fileId: null,
        fileName: null,
        deleted: false,
        createdAt: "2026-01-02T00:00:00.000Z",
        ...overrides,
    };
}

describe("conversationLabel", () => {
    it("uses the group name for group conversations", () => {
        expect(
            conversationLabel(
                conversation({ isGroup: true, groupName: "Rue Verte" }),
                "me",
                t,
            ),
        ).toBe("Rue Verte");
    });

    it("names the other participant for a direct conversation", () => {
        expect(
            conversationLabel(
                conversation({
                    participantsInfo: [
                        { id: "me", email: "me@x", name: "Me" },
                        { id: "bob", email: "bob@x", name: "Bob" },
                    ],
                }),
                "me",
                t,
            ),
        ).toBe("Bob");
    });
});

describe("conversationInitials", () => {
    it("combines the first letters of two words", () => {
        expect(conversationInitials("Bob Martin")).toBe("BM");
    });

    it("falls back to the first two characters of a single word", () => {
        expect(conversationInitials("Bob")).toBe("BO");
    });
});

describe("otherParticipantIds", () => {
    it("excludes the current user", () => {
        expect(otherParticipantIds(conversation(), "me")).toEqual(["bob"]);
    });
});

describe("messagePreview", () => {
    it("prefixes your own messages", () => {
        expect(messagePreview(message({ senderId: "me" }), "me", t)).toBe(
            "pages.messages.previewFromYou",
        );
    });

    it("shows an image placeholder for image messages", () => {
        expect(messagePreview(message({ type: "image" }), "me", t)).toBe(
            "pages.messages.previewImage",
        );
    });
});

describe("isConversationUnread", () => {
    it("is never unread when the conversation is active", () => {
        expect(
            isConversationUnread({
                conversation: conversation({ unreadCount: 3 }),
                isActive: true,
            }),
        ).toBe(false);
    });

    it("is unread when the server counted messages from others", () => {
        expect(
            isConversationUnread({
                conversation: conversation({ unreadCount: 2 }),
                isActive: false,
            }),
        ).toBe(true);
    });

    it("is read once the server count is back to zero", () => {
        expect(
            isConversationUnread({
                conversation: conversation({ unreadCount: 0 }),
                isActive: false,
            }),
        ).toBe(false);
    });
});
