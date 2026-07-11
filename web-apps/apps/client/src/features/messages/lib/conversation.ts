import type { Conversation, Message } from "@workspace/shared/lib/types";
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
    message: Message,
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

export function isConversationUnread({
    conversation,
    newestMessage,
    readAt,
    currentUserId,
    isActive,
}: {
    conversation: Conversation;
    newestMessage: Message | undefined;
    readAt: string | undefined;
    currentUserId: string;
    isActive: boolean;
}): boolean {
    if (isActive) return false;
    const newestMessageAt = newestMessage
        ? Date.parse(newestMessage.createdAt)
        : 0;
    const listActivityAt = conversation.lastMessageAt
        ? Date.parse(conversation.lastMessageAt)
        : 0;
    const latestActivityAt = Math.max(newestMessageAt, listActivityAt);
    if (latestActivityAt === 0) return false;
    const latestIsOwnMessage =
        newestMessage !== undefined &&
        newestMessageAt >= listActivityAt &&
        newestMessage.senderId === currentUserId;
    if (latestIsOwnMessage) return false;
    return !readAt || latestActivityAt > Date.parse(readAt);
}
