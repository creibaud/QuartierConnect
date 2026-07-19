import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Message01Icon } from "@hugeicons/core-free-icons";
import { useConversations } from "@workspace/shared/lib/hooks/useMessaging";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { cn } from "@workspace/ui/lib/utils";
import { PresenceBadge } from "@/features/realtime/presence-badge";
import { useRealtime } from "@/features/realtime/realtime-context";
import { useNewestCachedMessages } from "../hooks/use-newest-cached-messages";
import {
    conversationInitials,
    conversationLabel,
    formatConversationTimestamp,
    isConversationUnread,
    messagePreview,
    otherParticipantIds,
} from "../lib/conversation";

export function ConversationList({
    activeId,
    onSelect,
    currentUserId,
}: {
    activeId: string | null;
    onSelect: (id: string) => void;
    currentUserId: string;
}) {
    const { t, i18n } = useTranslation();
    const { data: conversations, isLoading, isError } = useConversations();
    const { onlineUserIds, typingUserIdsByConversation } = useRealtime();

    const sorted = useMemo(
        () =>
            [...(conversations ?? [])].sort((a, b) => {
                const aTime = a.lastMessageAt ?? a.createdAt;
                const bTime = b.lastMessageAt ?? b.createdAt;
                return new Date(bTime).getTime() - new Date(aTime).getTime();
            }),
        [conversations],
    );

    const conversationIds = useMemo(
        () => sorted.map((conv) => conv._id),
        [sorted],
    );
    const newestCachedById = useNewestCachedMessages(conversationIds);

    if (isLoading) {
        return (
            <div className="text-muted-foreground p-4 text-sm">
                {t("common.loading")}
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-destructive p-4 text-sm">
                {t("pages.messages.loadError")}
            </div>
        );
    }

    if (sorted.length === 0) {
        return (
            <div className="p-4">
                <EmptyState
                    icon={Message01Icon}
                    title={t("pages.messages.noConversations")}
                    description={t("pages.messages.noConversationsDescription")}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1 p-2">
            {sorted.map((conv) => {
                const label = conversationLabel(conv, currentUserId, t);
                const isActive = activeId === conv._id;
                // The cache only holds threads already opened; the list payload
                // covers the rest, including a cold load.
                const newestMessage =
                    newestCachedById.get(conv._id) ?? conv.lastMessage;
                const preview = newestMessage
                    ? messagePreview(newestMessage, currentUserId, t)
                    : null;
                const unread = isConversationUnread({
                    conversation: conv,
                    isActive,
                });
                const isOtherOnline = otherParticipantIds(
                    conv,
                    currentUserId,
                ).some((id) => onlineUserIds.has(id));
                const isOtherTyping = (
                    typingUserIdsByConversation[conv._id] ?? []
                ).some((id) => id !== currentUserId);
                return (
                    <button
                        key={conv._id}
                        onClick={() => onSelect(conv._id)}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                            "hover:bg-muted flex w-full items-start gap-3 rounded-lg border-s-2 border-transparent px-3 py-2.5 text-left transition-colors",
                            isActive && "bg-primary/10 border-primary",
                        )}
                    >
                        <Avatar size="sm">
                            <AvatarFallback>
                                {conversationInitials(label)}
                            </AvatarFallback>
                            <PresenceBadge online={isOtherOnline} />
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                                <p
                                    className={cn(
                                        "truncate text-sm font-medium",
                                        isActive && "font-semibold",
                                        unread && "font-semibold",
                                    )}
                                >
                                    {label}
                                </p>
                                {conv.lastMessageAt && (
                                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                                        {formatConversationTimestamp(
                                            conv.lastMessageAt,
                                            i18n.language,
                                        )}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <p
                                    className={cn(
                                        "text-muted-foreground min-w-0 flex-1 truncate text-xs",
                                        unread && "text-foreground font-medium",
                                        isOtherTyping &&
                                            "text-primary font-medium",
                                    )}
                                >
                                    {isOtherTyping
                                        ? t("realtime.typing")
                                        : (preview ?? " ")}
                                </p>
                                {unread && (
                                    <span className="bg-primary size-2 shrink-0 rounded-full">
                                        <span className="sr-only">
                                            {t("pages.messages.unread")}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
