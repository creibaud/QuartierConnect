import { describe, expect, it } from "vitest";
import type { Conversation, Message } from "@workspace/shared/lib/types";
import {
    buildMessageRows,
    conversationInitials,
    conversationLabel,
    formatDayLabel,
    isConversationUnread,
    isSameBurst,
    isSameDay,
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

// Timestamps are written without a zone so they parse as local time, which is
// what toDateString() compares against.
describe("isSameDay", () => {
    it("groups two hours of the same day", () => {
        expect(isSameDay("2026-01-02T08:15:00", "2026-01-02T22:45:00")).toBe(
            true,
        );
    });

    it("separates either side of midnight", () => {
        expect(isSameDay("2026-01-02T23:59:00", "2026-01-03T00:01:00")).toBe(
            false,
        );
    });

    it("separates either side of a month boundary", () => {
        expect(isSameDay("2026-01-31T23:00:00", "2026-02-01T01:00:00")).toBe(
            false,
        );
    });
});

describe("isSameBurst", () => {
    it("welds messages from one sender inside the window", () => {
        expect(
            isSameBurst(
                message({ createdAt: "2026-01-02T10:00:00" }),
                message({ _id: "m2", createdAt: "2026-01-02T10:04:59" }),
            ),
        ).toBe(true);
    });

    it("breaks once the window has elapsed", () => {
        expect(
            isSameBurst(
                message({ createdAt: "2026-01-02T10:00:00" }),
                message({ _id: "m2", createdAt: "2026-01-02T10:05:01" }),
            ),
        ).toBe(false);
    });

    it("breaks on a sender change", () => {
        expect(
            isSameBurst(
                message({ senderId: "bob", createdAt: "2026-01-02T10:00:00" }),
                message({
                    _id: "m2",
                    senderId: "me",
                    createdAt: "2026-01-02T10:00:00",
                }),
            ),
        ).toBe(false);
    });

    it("breaks across midnight even inside the window", () => {
        expect(
            isSameBurst(
                message({ createdAt: "2026-01-02T23:58:00" }),
                message({ _id: "m2", createdAt: "2026-01-03T00:01:00" }),
            ),
        ).toBe(false);
    });
});

describe("formatDayLabel", () => {
    it("labels today", () => {
        expect(formatDayLabel(new Date().toISOString(), "en-US", t)).toBe(
            "messaging.today",
        );
    });

    it("labels yesterday", () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        expect(formatDayLabel(yesterday.toISOString(), "en-US", t)).toBe(
            "messaging.yesterday",
        );
    });

    it("spells out the weekday for older dates", () => {
        expect(formatDayLabel("2020-03-05T12:00:00", "en-US", t)).toContain(
            "Thursday",
        );
    });
});

describe("buildMessageRows", () => {
    it("assigns first/middle/last across a burst", () => {
        const rows = buildMessageRows({
            messages: [
                message({ _id: "a", createdAt: "2026-01-02T10:00:00" }),
                message({ _id: "b", createdAt: "2026-01-02T10:01:00" }),
                message({ _id: "c", createdAt: "2026-01-02T10:02:00" }),
            ],
            currentUserId: "me",
        });
        expect(rows.map((row) => row.position)).toEqual([
            "first",
            "middle",
            "last",
        ]);
    });

    it("shows the time only on the last message of a burst", () => {
        const rows = buildMessageRows({
            messages: [
                message({ _id: "a", createdAt: "2026-01-02T10:00:00" }),
                message({ _id: "b", createdAt: "2026-01-02T10:01:00" }),
                message({ _id: "c", createdAt: "2026-01-02T10:02:00" }),
            ],
            currentUserId: "me",
        });
        expect(rows.map((row) => row.showTime)).toEqual([false, false, true]);
    });

    it("starts the burst only on the first message", () => {
        const rows = buildMessageRows({
            messages: [
                message({ _id: "a", createdAt: "2026-01-02T10:00:00" }),
                message({ _id: "b", createdAt: "2026-01-02T10:01:00" }),
                message({ _id: "c", createdAt: "2026-01-02T10:02:00" }),
            ],
            currentUserId: "me",
        });
        expect(rows.map((row) => row.startsBurst)).toEqual([
            true,
            false,
            false,
        ]);
    });

    it("breaks the burst when the sender changes", () => {
        const rows = buildMessageRows({
            messages: [
                message({
                    _id: "a",
                    senderId: "bob",
                    createdAt: "2026-01-02T10:00:00",
                }),
                message({
                    _id: "b",
                    senderId: "me",
                    createdAt: "2026-01-02T10:00:30",
                }),
            ],
            currentUserId: "me",
        });
        expect(rows.map((row) => row.position)).toEqual(["only", "only"]);
        expect(rows.map((row) => row.isOutgoing)).toEqual([false, true]);
    });

    it("marks an isolated message as only, with its time shown", () => {
        const [row] = buildMessageRows({
            messages: [message({ createdAt: "2026-01-02T10:00:00" })],
            currentUserId: "me",
        });
        expect(row.position).toBe("only");
        expect(row.showTime).toBe(true);
    });

    it("always starts a day on the first row, and again on a new day", () => {
        const rows = buildMessageRows({
            messages: [
                message({ _id: "a", createdAt: "2026-01-02T10:00:00" }),
                message({ _id: "b", createdAt: "2026-01-02T10:01:00" }),
                message({ _id: "c", createdAt: "2026-01-03T09:00:00" }),
            ],
            currentUserId: "me",
        });
        expect(rows.map((row) => row.startsDay)).toEqual([true, false, true]);
    });

    it("resolves the sender name when participant names are supplied", () => {
        const [row] = buildMessageRows({
            messages: [message({ senderId: "bob" })],
            currentUserId: "me",
            participantNames: new Map([["bob", "Bob"]]),
        });
        expect(row.senderName).toBe("Bob");
    });
});
