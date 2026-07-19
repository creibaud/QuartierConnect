import type {
    Conversation,
    LastMessagePreview,
    Message,
} from "@workspace/shared/lib/types";
import type { TFunction } from "i18next";

export function conversationLabel(
    conv: Conversation,
    currentUserId: string,
    t: TFunction,
): string {
    if (conv.isGroup) {
        return conv.groupName ?? t("pages.messages.group");
    }
    const others = (conv.participantsInfo ?? [])
        .filter((p) => p.id !== currentUserId && (p.name || p.email))
        .map((p) => (p.name ?? p.email) as string);
    if (others.length === 0) return t("pages.messages.conversation");
    if (others.length <= 2) return others.join(", ");
    return `${others[0]} +${others.length - 1}`;
}

export function otherParticipantIds(
    conv: Conversation,
    currentUserId: string,
): string[] {
    const ids =
        conv.participantsInfo?.map((participant) => participant.id) ??
        conv.participants ??
        [];
    return ids.filter((id) => id !== currentUserId);
}

export function conversationInitials(label: string): string {
    const parts = label.split(/\s+/).filter(Boolean);
    return (
        parts.length > 1 ? parts[0][0] + parts[1][0] : label.slice(0, 2)
    ).toUpperCase();
}

export function formatConversationTimestamp(
    isoDate: string,
    locale: string,
): string {
    const date = new Date(isoDate);
    const isToday = date.toDateString() === new Date().toDateString();
    if (isToday) {
        return date.toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export function messagePreview(
    message: LastMessagePreview,
    currentUserId: string,
    t: TFunction,
): string {
    const body =
        message.type === "image"
            ? t("pages.messages.previewImage")
            : message.type === "audio"
              ? t("pages.messages.previewAudio")
              : message.type === "file"
                ? (message.fileName ?? t("pages.messages.previewFile"))
                : (message.content ?? "");
    return message.senderId === currentUserId
        ? t("pages.messages.previewFromYou", { preview: body })
        : body;
}

/**
 * The count is the server's, computed against a persisted read marker. Opening
 * the thread clears it, so an active conversation never shows the badge.
 */
export function isConversationUnread({
    conversation,
    isActive,
}: {
    conversation: Conversation;
    isActive: boolean;
}): boolean {
    return !isActive && conversation.unreadCount > 0;
}

export const BURST_WINDOW_MS = 5 * 60_000;

export type MessageRowModel = {
    message: Message;
    isOutgoing: boolean;
    position: "only" | "first" | "middle" | "last";
    showTime: boolean;
    startsBurst: boolean;
    startsDay: boolean;
    senderName?: string;
};

export function isSameDay(a: string, b: string): boolean {
    return new Date(a).toDateString() === new Date(b).toDateString();
}

export function isSameBurst(previous: Message, current: Message): boolean {
    if (previous.senderId !== current.senderId) return false;
    if (!isSameDay(previous.createdAt, current.createdAt)) return false;
    return (
        new Date(current.createdAt).getTime() -
            new Date(previous.createdAt).getTime() <=
        BURST_WINDOW_MS
    );
}

export function formatDayLabel(
    isoDate: string,
    locale: string,
    t: TFunction,
): string {
    const date = new Date(isoDate);
    const today = new Date();
    if (date.toDateString() === today.toDateString())
        return t("messaging.today");
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString())
        return t("messaging.yesterday");
    return date.toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
}

export function buildMessageRows({
    messages,
    currentUserId,
    participantNames,
}: {
    messages: Message[];
    currentUserId: string;
    participantNames?: Map<string, string>;
}): MessageRowModel[] {
    return messages.map((message, index) => {
        const previous = messages[index - 1];
        const next = messages[index + 1];
        const previousSame = previous ? isSameBurst(previous, message) : false;
        const nextSame = next ? isSameBurst(message, next) : false;
        return {
            message,
            isOutgoing: message.senderId === currentUserId,
            position:
                !previousSame && !nextSame
                    ? "only"
                    : !previousSame
                      ? "first"
                      : !nextSame
                        ? "last"
                        : "middle",
            showTime: !nextSame,
            startsBurst: !previousSame,
            startsDay:
                !previous || !isSameDay(previous.createdAt, message.createdAt),
            senderName: participantNames?.get(message.senderId),
        };
    });
}
