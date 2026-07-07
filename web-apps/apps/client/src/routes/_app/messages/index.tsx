import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Add01Icon,
    Attachment01Icon,
    Download01Icon,
    Message01Icon,
    Mic01Icon,
    SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { apiBlob, apiBlobUrl } from "@workspace/shared/lib/api";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import {
    useConversations,
    useCreateConversation,
    useMessages,
    useSendFileMessage,
    useSocketMessages,
} from "@workspace/shared/lib/hooks/useMessaging";
import type { Conversation, Message } from "@workspace/shared/lib/types";
import {
    Attachment,
    AttachmentContent,
    AttachmentDescription,
    AttachmentMedia,
    AttachmentTitle,
} from "@workspace/ui/components/attachment";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble";
import { Button } from "@workspace/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { Input } from "@workspace/ui/components/input";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@workspace/ui/components/input-group";
import { Label } from "@workspace/ui/components/label";
import {
    MessageContent,
    MessageFooter,
    MessageGroup,
    Message as MessageRow,
} from "@workspace/ui/components/message";
import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerItem,
    MessageScrollerProvider,
    MessageScrollerViewport,
} from "@workspace/ui/components/message-scroller";
import { PageHeader } from "@workspace/ui/components/page-header";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@workspace/ui/components/sheet";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import type { TFunction } from "i18next";
import { toast } from "sonner";
import {
    formatRecordingDuration,
    useVoiceRecorder,
} from "@/features/messages/use-voice-recorder";
import { PresenceBadge } from "@/features/realtime/presence-badge";
import {
    useRealtime,
    useTypingUserIds,
} from "@/features/realtime/realtime-context";
import { useTypingEmitter } from "@/features/realtime/use-typing-emitter";

export const Route = createFileRoute("/_app/messages/")({
    component: MessagesPage,
    validateSearch: (
        search: Record<string, unknown>,
    ): { conversation?: string } => ({
        conversation:
            typeof search.conversation === "string"
                ? search.conversation
                : undefined,
    }),
});

function conversationLabel(
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

function otherParticipantIds(
    conv: Conversation,
    currentUserId: string,
): string[] {
    const ids =
        conv.participantsInfo?.map((participant) => participant.id) ??
        conv.participants ??
        [];
    return ids.filter((id) => id !== currentUserId);
}

function conversationInitials(label: string): string {
    const parts = label.split(/\s+/).filter(Boolean);
    return (
        parts.length > 1 ? parts[0][0] + parts[1][0] : label.slice(0, 2)
    ).toUpperCase();
}

function formatConversationTimestamp(isoDate: string, locale: string): string {
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

function messagePreview(
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

function isConversationUnread({
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

const READ_MARKERS_STORAGE_KEY = "quartierconnect.messages.readMarkers";

function loadReadMarkers(): Record<string, string> {
    try {
        const raw = localStorage.getItem(READ_MARKERS_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
        return {};
    }
}

function useConversationReadMarkers() {
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

function useNewestCachedMessages(
    conversationIds: string[],
): Map<string, Message | undefined> {
    const queryClient = useQueryClient();
    const [cacheVersion, setCacheVersion] = useState(0);

    useEffect(() => {
        let disposed = false;
        let refreshScheduled = false;
        const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
            if (event.type !== "updated") return;
            if (event.query.queryKey[0] !== "messages") return;
            if (refreshScheduled) return;
            refreshScheduled = true;
            queueMicrotask(() => {
                refreshScheduled = false;
                if (!disposed) setCacheVersion((version) => version + 1);
            });
        });
        return () => {
            disposed = true;
            unsubscribe();
        };
    }, [queryClient]);

    return useMemo(() => {
        const newestById = new Map<string, Message | undefined>();
        conversationIds.forEach((id) => {
            const messages = queryClient.getQueryData<Message[]>([
                "messages",
                id,
                1,
            ]);
            newestById.set(id, messages?.[0]);
        });
        return newestById;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- cacheVersion re-reads the query cache
    }, [conversationIds, queryClient, cacheVersion]);
}

function useAuthedFileUrl(fileId: string): string | null {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        let objectUrl: string | null = null;
        apiBlobUrl(`/messaging/files/${fileId}`)
            .then((created) => {
                if (cancelled) {
                    URL.revokeObjectURL(created);
                    return;
                }
                objectUrl = created;
                setUrl(created);
            })
            .catch(() => {
                // file failed to load — leave placeholder
            });
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [fileId]);

    return url;
}

function AuthedImage({ fileId, alt }: { fileId: string; alt: string }) {
    const { t } = useTranslation();
    const url = useAuthedFileUrl(fileId);

    if (!url) {
        return (
            <div className="text-muted-foreground py-6 text-center text-xs">
                {t("common.loading")}
            </div>
        );
    }

    return (
        <img
            src={url}
            alt={alt}
            className="max-h-64 max-w-full rounded-lg object-cover"
        />
    );
}

function AuthedAudio({ fileId }: { fileId: string }) {
    const { t } = useTranslation();
    const url = useAuthedFileUrl(fileId);

    if (!url) {
        return (
            <div className="text-muted-foreground w-60 py-2 text-center text-xs">
                {t("common.loading")}
            </div>
        );
    }

    return (
        <audio
            controls
            preload="metadata"
            src={url}
            aria-label={t("messaging.voiceMessage")}
            className="h-10 w-60 max-w-full"
        />
    );
}

function FileAttachment({ message }: { message: Message }) {
    const { t } = useTranslation();
    const [downloading, setDownloading] = useState(false);

    async function handleDownload() {
        if (!message.fileId) return;
        setDownloading(true);
        try {
            const blob = await apiBlob(`/messaging/files/${message.fileId}`);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = message.fileName ?? "file";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            toast.error(t("messaging.uploadError"));
        } finally {
            setDownloading(false);
        }
    }

    return (
        <Attachment size="sm">
            <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="flex min-w-0 items-center gap-2"
            >
                <AttachmentMedia variant="icon">
                    <HugeiconsIcon icon={Download01Icon} />
                </AttachmentMedia>
                <AttachmentContent>
                    <AttachmentTitle>
                        {message.fileName ?? t("messaging.download")}
                    </AttachmentTitle>
                    <AttachmentDescription>
                        {downloading
                            ? t("messaging.sending")
                            : t("messaging.download")}
                    </AttachmentDescription>
                </AttachmentContent>
            </button>
        </Attachment>
    );
}

function MessageBubble({
    message,
    isOutgoing,
}: {
    message: Message;
    isOutgoing: boolean;
}) {
    const { t, i18n } = useTranslation();
    const time = new Date(message.createdAt).toLocaleTimeString(i18n.language, {
        hour: "2-digit",
        minute: "2-digit",
    });

    const isImage = message.type === "image" && !!message.fileId;
    const isAudio = message.type === "audio" && !!message.fileId;
    const isFile = message.type === "file" && !!message.fileId;
    const isMedia = isImage || isAudio || isFile;
    const align = isOutgoing ? "end" : "start";

    return (
        <MessageRow align={align}>
            <MessageContent>
                <Bubble
                    variant={
                        isMedia ? "muted" : isOutgoing ? "default" : "muted"
                    }
                    align={align}
                >
                    <BubbleContent className={cn(isMedia && "p-1.5")}>
                        {isImage ? (
                            <AuthedImage
                                fileId={message.fileId!}
                                alt={
                                    message.fileName ?? t("messaging.imageAlt")
                                }
                            />
                        ) : isAudio ? (
                            <AuthedAudio fileId={message.fileId!} />
                        ) : isFile ? (
                            <FileAttachment message={message} />
                        ) : (
                            (message.content ?? "")
                        )}
                    </BubbleContent>
                </Bubble>
                <MessageFooter>
                    <span className="tabular-nums">{time}</span>
                </MessageFooter>
            </MessageContent>
        </MessageRow>
    );
}

function ConversationThread({
    conversationId,
    currentUserId,
    onRead,
}: {
    conversationId: string;
    currentUserId: string;
    onRead: (conversationId: string, readAt: string) => void;
}) {
    const { t } = useTranslation();
    const [inputValue, setInputValue] = useState("");
    const [localMessages, setLocalMessages] = useState<Message[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: fetchedMessages, isLoading } = useMessages(conversationId);
    const sendFile = useSendFileMessage(conversationId);

    const recorder = useVoiceRecorder({
        onRecordingComplete: (file) =>
            sendFile.mutate(file, {
                onError: () => toast.error(t("messaging.uploadError")),
            }),
        onPermissionDenied: () =>
            toast.error(t("messaging.micPermissionDenied")),
        onRecordingUnsupported: () =>
            toast.error(t("messaging.recordingUnsupported")),
    });

    const handleNewMessage = useCallback((msg: Message) => {
        setLocalMessages((prev) => {
            const alreadyPresent = prev.some((m) => m._id === msg._id);
            return alreadyPresent ? prev : [...prev, msg];
        });
    }, []);

    const { sendMessage } = useSocketMessages(conversationId, handleNewMessage);
    const { notifyTyping, stopTyping } = useTypingEmitter(conversationId);

    const allMessages = useMemo<Message[]>(() => {
        const base = fetchedMessages ?? [];
        const reversed = [...base].reverse();
        const extra = localMessages.filter(
            (lm) => !reversed.some((m) => m._id === lm._id),
        );
        return [...reversed, ...extra];
    }, [fetchedMessages, localMessages]);

    const newestMessageAt = allMessages[allMessages.length - 1]?.createdAt;

    useEffect(() => {
        onRead(conversationId, newestMessageAt ?? new Date().toISOString());
    }, [conversationId, newestMessageAt, onRead]);

    function handleSend(e: React.FormEvent) {
        e.preventDefault();
        const text = inputValue.trim();
        if (!text) return;
        // Optimistic clear; the draft is restored on failure.
        stopTyping();
        setInputValue("");
        sendMessage(text)
            .then((msg) => handleNewMessage(msg))
            .catch(() => {
                toast.error(t("messaging.sendError"));
                setInputValue(text);
            });
    }

    function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        sendFile.mutate(file, {
            onError: () => toast.error(t("messaging.uploadError")),
        });
        e.target.value = "";
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <MessageScrollerProvider>
                <MessageScroller className="min-h-0 flex-1">
                    <MessageScrollerViewport className="p-4">
                        <MessageScrollerContent className="gap-2">
                            {isLoading ? (
                                <MessageGroup>
                                    {[0, 1, 2, 3].map((i) => {
                                        const outgoing = i % 2 === 1;
                                        return (
                                            <MessageRow
                                                key={i}
                                                align={
                                                    outgoing ? "end" : "start"
                                                }
                                            >
                                                <MessageContent>
                                                    <Bubble
                                                        variant={
                                                            outgoing
                                                                ? "default"
                                                                : "muted"
                                                        }
                                                        align={
                                                            outgoing
                                                                ? "end"
                                                                : "start"
                                                        }
                                                    >
                                                        <BubbleContent>
                                                            <span className="shimmer">
                                                                {"█".repeat(
                                                                    6 +
                                                                        ((i *
                                                                            7) %
                                                                            14),
                                                                )}
                                                            </span>
                                                        </BubbleContent>
                                                    </Bubble>
                                                </MessageContent>
                                            </MessageRow>
                                        );
                                    })}
                                </MessageGroup>
                            ) : allMessages.length === 0 ? (
                                <div className="text-muted-foreground py-8 text-center text-sm">
                                    {t("pages.messages.noMessages")}
                                </div>
                            ) : (
                                allMessages.map((msg, i) => (
                                    <MessageScrollerItem
                                        key={msg._id}
                                        scrollAnchor={
                                            i === allMessages.length - 1
                                        }
                                    >
                                        <MessageBubble
                                            message={msg}
                                            isOutgoing={
                                                msg.senderId === currentUserId
                                            }
                                        />
                                    </MessageScrollerItem>
                                ))
                            )}
                        </MessageScrollerContent>
                    </MessageScrollerViewport>
                    <MessageScrollerButton direction="end" />
                </MessageScroller>
            </MessageScrollerProvider>

            <form onSubmit={handleSend} className="border-border border-t p-4">
                {recorder.isRecording ? (
                    <div className="border-input flex h-11 items-center gap-3 rounded-xl border px-3">
                        <span className="relative flex size-2.5 shrink-0">
                            <span className="bg-destructive absolute inline-flex size-full animate-ping rounded-full opacity-75" />
                            <span className="bg-destructive relative inline-flex size-2.5 rounded-full" />
                        </span>
                        <span
                            aria-live="polite"
                            className="flex-1 text-sm tabular-nums"
                        >
                            <span className="sr-only">
                                {t("messaging.recording")}{" "}
                            </span>
                            {formatRecordingDuration(recorder.elapsedMs)}
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={recorder.cancel}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={recorder.stopAndSend}
                        >
                            <HugeiconsIcon icon={SentIcon} size={14} />
                            {t("pages.messages.send")}
                        </Button>
                    </div>
                ) : (
                    <InputGroup>
                        <InputGroupInput
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                notifyTyping();
                            }}
                            placeholder={t("messaging.typePlaceholder")}
                            autoComplete="off"
                        />
                        <InputGroupAddon align="inline-start">
                            <InputGroupButton
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                disabled={sendFile.isPending}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <HugeiconsIcon icon={Attachment01Icon} />
                                <span className="sr-only">
                                    {t("messaging.attachFile")}
                                </span>
                            </InputGroupButton>
                        </InputGroupAddon>
                        <InputGroupAddon align="inline-end">
                            {sendFile.isPending && <Spinner />}
                            <InputGroupButton
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                disabled={sendFile.isPending}
                                onClick={() => void recorder.start()}
                            >
                                <HugeiconsIcon icon={Mic01Icon} />
                                <span className="sr-only">
                                    {t("messaging.recordVoice")}
                                </span>
                            </InputGroupButton>
                            <InputGroupButton
                                type="submit"
                                variant="default"
                                size="icon-sm"
                                disabled={!inputValue.trim()}
                            >
                                <HugeiconsIcon icon={SentIcon} />
                                <span className="sr-only">
                                    {t("pages.messages.send")}
                                </span>
                            </InputGroupButton>
                        </InputGroupAddon>
                    </InputGroup>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFilePick}
                />
            </form>
        </div>
    );
}

function ConversationList({
    activeId,
    onSelect,
    currentUserId,
    readMarkers,
}: {
    activeId: string | null;
    onSelect: (id: string) => void;
    currentUserId: string;
    readMarkers: Record<string, string>;
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
                const newestMessage = newestCachedById.get(conv._id);
                const preview = newestMessage
                    ? messagePreview(newestMessage, currentUserId, t)
                    : null;
                const unread = isConversationUnread({
                    conversation: conv,
                    newestMessage,
                    readAt: readMarkers[conv._id],
                    currentUserId,
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
                        className={cn(
                            "hover:bg-muted flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                            isActive && "bg-primary/10",
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
                                        isActive && "text-primary",
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
                                        : (preview ?? "\u00A0")}
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

function NewConversationDialog({
    open,
    onOpenChange,
    onCreated,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (id: string) => void;
}) {
    const { t } = useTranslation();
    const [email, setEmail] = useState("");
    const create = useCreateConversation();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = email.trim().toLowerCase();
        if (!trimmed) return;
        try {
            const conv = await create.mutateAsync({
                participantEmails: [trimmed],
            });
            toast.success(t("pages.messages.conversationReady"));
            setEmail("");
            onOpenChange(false);
            onCreated(conv._id);
        } catch (err) {
            // Map stable backend codes to localized messages.
            const codeKeys: Record<string, string> = {
                USER_EMAIL_NOT_FOUND: "pages.messages.userEmailNotFound",
                SELF_CONVERSATION: "pages.messages.selfConversation",
                NO_OTHER_PARTICIPANTS: "pages.messages.participantsRequired",
                PARTICIPANTS_REQUIRED: "pages.messages.participantsRequired",
            };
            const code = (err as { code?: string }).code;
            toast.error(
                t(
                    (code && codeKeys[code]) ??
                        "pages.messages.createConversationError",
                ),
            );
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("messaging.newConversation")}</DialogTitle>
                    <DialogDescription>
                        {t("pages.messages.newConversationDescription")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="conv-email">
                            {t("pages.messages.neighborEmail")}
                        </Label>
                        <Input
                            id="conv-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="bob@demo.fr"
                            autoComplete="off"
                            autoFocus
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={create.isPending || !email.trim()}
                        >
                            {create.isPending
                                ? t("common.creating")
                                : t("pages.messages.start")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function MessagesPage() {
    const { t } = useTranslation();
    const user = getCurrentUser();
    const { conversation } = Route.useSearch();
    const [activeConversationId, setActiveConversationId] = useState<
        string | null
    >(conversation ?? null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [newConvOpen, setNewConvOpen] = useState(false);
    const { data: conversations } = useConversations();
    const { readMarkers, markConversationRead } = useConversationReadMarkers();
    const { onlineUserIds } = useRealtime();
    const activeTypingUserIds = useTypingUserIds(activeConversationId);

    if (!user) return null;

    const activeConversation = (conversations ?? []).find(
        (conv) => conv._id === activeConversationId,
    );
    const activeLabel = activeConversation
        ? conversationLabel(activeConversation, user.sub, t)
        : t("pages.messages.conversation");
    const isActiveOtherOnline = activeConversation
        ? otherParticipantIds(activeConversation, user.sub).some((id) =>
              onlineUserIds.has(id),
          )
        : false;
    const isActiveOtherTyping = activeTypingUserIds.some(
        (id) => id !== user.sub,
    );

    function handleSelectConversation(id: string) {
        setActiveConversationId(id);
        setSheetOpen(false);
    }

    function handleConversationCreated(id: string) {
        setActiveConversationId(id);
    }

    return (
        <div className="flex h-[calc(100svh-4rem)] flex-col p-6 md:p-8">
            <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6">
                <PageHeader
                    title={t("pages.messages.title")}
                    description={t("pages.messages.description")}
                    actions={
                        <>
                            <div className="md:hidden">
                                <Sheet
                                    open={sheetOpen}
                                    onOpenChange={setSheetOpen}
                                >
                                    <SheetTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            {t("pages.messages.conversations")}
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent
                                        side="left"
                                        className="flex w-72 flex-col p-0"
                                    >
                                        <SheetHeader className="border-border border-b px-4 py-3">
                                            <SheetTitle>
                                                {t(
                                                    "pages.messages.conversations",
                                                )}
                                            </SheetTitle>
                                        </SheetHeader>
                                        <ScrollArea className="min-h-0 flex-1">
                                            <ConversationList
                                                activeId={activeConversationId}
                                                onSelect={
                                                    handleSelectConversation
                                                }
                                                currentUserId={user.sub}
                                                readMarkers={readMarkers}
                                            />
                                        </ScrollArea>
                                    </SheetContent>
                                </Sheet>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setNewConvOpen(true)}
                            >
                                <HugeiconsIcon icon={Add01Icon} size={14} />
                                {t("messaging.newConversation")}
                            </Button>
                        </>
                    }
                />

                <div className="border-border bg-card flex min-h-0 flex-1 overflow-hidden rounded-xl border">
                    <aside className="border-border hidden w-80 shrink-0 flex-col border-r md:flex">
                        <div className="border-border border-b px-4 py-3">
                            <h2 className="text-sm font-semibold">
                                {t("pages.messages.conversations")}
                            </h2>
                        </div>
                        <ScrollArea className="min-h-0 flex-1">
                            <ConversationList
                                activeId={activeConversationId}
                                onSelect={setActiveConversationId}
                                currentUserId={user.sub}
                                readMarkers={readMarkers}
                            />
                        </ScrollArea>
                    </aside>

                    <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
                        {activeConversationId ? (
                            <>
                                <div className="border-border flex items-center gap-3 border-b px-4 py-3">
                                    <Avatar size="sm">
                                        <AvatarFallback>
                                            {conversationInitials(activeLabel)}
                                        </AvatarFallback>
                                        <PresenceBadge
                                            online={isActiveOtherOnline}
                                        />
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold">
                                            {activeLabel}
                                        </p>
                                        <p
                                            aria-live="polite"
                                            className="text-primary truncate text-xs empty:hidden"
                                        >
                                            {isActiveOtherTyping
                                                ? t("realtime.typing")
                                                : null}
                                        </p>
                                    </div>
                                </div>
                                <ConversationThread
                                    key={activeConversationId}
                                    conversationId={activeConversationId}
                                    currentUserId={user.sub}
                                    onRead={markConversationRead}
                                />
                            </>
                        ) : (
                            <div className="flex flex-1 items-center justify-center p-6">
                                <EmptyState
                                    icon={Message01Icon}
                                    title={t(
                                        "pages.messages.noneSelectedTitle",
                                    )}
                                    description={t(
                                        "pages.messages.noneSelectedDescription",
                                    )}
                                    action={
                                        <Button
                                            size="sm"
                                            onClick={() => setNewConvOpen(true)}
                                        >
                                            <HugeiconsIcon
                                                icon={Add01Icon}
                                                size={14}
                                            />
                                            {t("messaging.newConversation")}
                                        </Button>
                                    }
                                />
                            </div>
                        )}
                    </main>
                </div>
            </div>

            <NewConversationDialog
                open={newConvOpen}
                onOpenChange={setNewConvOpen}
                onCreated={handleConversationCreated}
            />
        </div>
    );
}
