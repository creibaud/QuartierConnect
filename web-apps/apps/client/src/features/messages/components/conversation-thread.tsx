import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Attachment01Icon,
    Mic01Icon,
    SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    useMessages,
    useSendFileMessage,
    useSocketMessages,
} from "@workspace/shared/lib/hooks/useMessaging";
import type { Conversation, Message } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupText,
} from "@workspace/ui/components/input-group";
import {
    MessageContent,
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
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import { toast } from "sonner";
import {
    formatRecordingDuration,
    useVoiceRecorder,
} from "@/features/messages/hooks/use-voice-recorder";
import {
    buildMessageRows,
    formatDayLabel,
} from "@/features/messages/lib/conversation";
import { useTypingEmitter } from "@/features/realtime/use-typing-emitter";
import { MessageBubble } from "./message-bubble";

// Mirrors MAX_MESSAGE_CONTENT_LENGTH in api/src/messaging/messaging.gateway.ts.
const MAX_MESSAGE_LENGTH = 4000;

export function ConversationThread({
    conversationId,
    conversation,
    currentUserId,
    onRead,
}: {
    conversationId: string;
    conversation?: Conversation;
    currentUserId: string;
    onRead: (conversationId: string) => void;
}) {
    const { t, i18n } = useTranslation();
    const [inputValue, setInputValue] = useState("");
    const [localMessages, setLocalMessages] = useState<Message[]>([]);
    const [isSending, setIsSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recordingBarRef = useRef<HTMLDivElement>(null);

    const {
        data: fetchedMessages,
        isLoading,
        isError,
        refetch,
    } = useMessages(conversationId);
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

    const participantNames = useMemo(() => {
        const map = new Map<string, string>();
        for (const p of conversation?.participantsInfo ?? []) {
            const name = p.name ?? p.email;
            if (name) map.set(p.id, name);
        }
        return map;
    }, [conversation]);

    const rows = useMemo(
        () =>
            buildMessageRows({
                messages: allMessages,
                currentUserId,
                participantNames: conversation?.isGroup
                    ? participantNames
                    : undefined,
            }),
        [allMessages, currentUserId, conversation?.isGroup, participantNames],
    );

    const newestMessageAt = allMessages[allMessages.length - 1]?.createdAt;

    // Re-runs as messages land so a thread read live never keeps a stale badge.
    useEffect(() => {
        onRead(conversationId);
    }, [conversationId, newestMessageAt, onRead]);

    // The mic button unmounts on press, so focus would otherwise fall to body.
    useEffect(() => {
        if (recorder.isRecording) recordingBarRef.current?.focus();
    }, [recorder.isRecording]);

    const canSend =
        inputValue.trim().length > 0 && !isSending && !sendFile.isPending;

    function handleSend(e: React.FormEvent) {
        e.preventDefault();
        const text = inputValue.trim();
        if (!text || isSending) return;
        stopTyping();
        setInputValue("");
        setIsSending(true);
        sendMessage(text)
            .then((msg) => {
                if (!msg?._id) throw new Error("bad ack");
                handleNewMessage(msg);
            })
            .catch(() => {
                toast.error(t("messaging.sendError"));
                setInputValue(text);
            })
            .finally(() => setIsSending(false));
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
                    <MessageScrollerViewport className="px-4 py-6">
                        <MessageScrollerContent
                            className="gap-0"
                            role="log"
                            aria-live="polite"
                            aria-relevant="additions"
                            aria-label={t("messaging.threadLabel")}
                        >
                            {isLoading ? (
                                <>
                                    <span className="sr-only" role="status">
                                        {t("common.loading")}
                                    </span>
                                    <div aria-hidden="true">
                                        <MessageGroup className="gap-4">
                                            {[
                                                { w: "w-40", out: false },
                                                { w: "w-24", out: true },
                                                { w: "w-56", out: false },
                                                { w: "w-32", out: true },
                                            ].map((row, i) => (
                                                <MessageRow
                                                    key={i}
                                                    align={
                                                        row.out
                                                            ? "end"
                                                            : "start"
                                                    }
                                                >
                                                    <MessageContent className="gap-1">
                                                        <div
                                                            className={cn(
                                                                "bg-muted h-8 animate-pulse rounded-md motion-reduce:animate-none",
                                                                row.w,
                                                            )}
                                                        />
                                                        <div className="h-4" />
                                                    </MessageContent>
                                                </MessageRow>
                                            ))}
                                        </MessageGroup>
                                    </div>
                                </>
                            ) : isError ? (
                                <div className="flex flex-col items-center gap-3 py-8 text-center">
                                    <p className="text-destructive text-sm">
                                        {t("pages.messages.loadError")}
                                    </p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => void refetch()}
                                    >
                                        {t("common.retry")}
                                    </Button>
                                </div>
                            ) : rows.length === 0 ? (
                                <div className="text-muted-foreground py-8 text-center text-sm">
                                    {t("pages.messages.noMessages")}
                                </div>
                            ) : (
                                rows.map((row, i) => (
                                    <MessageScrollerItem
                                        key={row.message._id}
                                        scrollAnchor={i === rows.length - 1}
                                        className={cn(
                                            "[contain-intrinsic-size:auto_3rem]",
                                            i === 0
                                                ? "mt-0"
                                                : row.startsDay
                                                  ? "mt-8"
                                                  : row.startsBurst
                                                    ? "mt-4"
                                                    : "mt-0.5",
                                            i === rows.length - 1 &&
                                                "animate-in fade-in slide-in-from-bottom-1 duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-none",
                                        )}
                                    >
                                        {row.startsDay && (
                                            <div
                                                role="separator"
                                                className="flex items-center gap-3 pb-4"
                                            >
                                                <div className="bg-border h-px flex-1" />
                                                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                                    {formatDayLabel(
                                                        row.message.createdAt,
                                                        i18n.language,
                                                        t,
                                                    )}
                                                </span>
                                                <div className="bg-border h-px flex-1" />
                                            </div>
                                        )}
                                        <MessageBubble
                                            message={row.message}
                                            isOutgoing={row.isOutgoing}
                                            showTime={row.showTime}
                                            startsBurst={row.startsBurst}
                                            senderName={row.senderName}
                                        />
                                    </MessageScrollerItem>
                                ))
                            )}
                        </MessageScrollerContent>
                    </MessageScrollerViewport>
                    <MessageScrollerButton
                        direction="end"
                        label={t("messaging.scrollToLatest")}
                    />
                </MessageScroller>
            </MessageScrollerProvider>

            <form onSubmit={handleSend} className="border-border border-t p-4">
                {recorder.isRecording ? (
                    <InputGroup
                        ref={recordingBarRef}
                        tabIndex={-1}
                        aria-label={t("messaging.recording")}
                        className="h-auto min-h-11 items-center"
                    >
                        <InputGroupAddon align="inline-start" className="py-1">
                            <span className="relative flex size-2.5 shrink-0">
                                <span className="bg-destructive absolute inline-flex size-full rounded-full opacity-75 motion-safe:animate-ping" />
                                <span className="bg-destructive relative inline-flex size-2.5 rounded-full" />
                            </span>
                        </InputGroupAddon>
                        <InputGroupText className="flex-1 tabular-nums">
                            <span className="sr-only" role="status">
                                {t("messaging.recording")}
                            </span>
                            <span aria-hidden="true">
                                {formatRecordingDuration(recorder.elapsedMs)}
                            </span>
                        </InputGroupText>
                        <InputGroupAddon align="inline-end" className="py-1">
                            <InputGroupButton
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={recorder.cancel}
                            >
                                {t("common.cancel")}
                            </InputGroupButton>
                            <InputGroupButton
                                type="button"
                                variant="default"
                                size="xs"
                                onClick={recorder.stopAndSend}
                            >
                                <HugeiconsIcon icon={SentIcon} />
                                {t("pages.messages.send")}
                            </InputGroupButton>
                        </InputGroupAddon>
                    </InputGroup>
                ) : (
                    <InputGroup className="h-auto min-h-11 items-end">
                        <InputGroupAddon align="inline-start" className="py-1">
                            <InputGroupButton
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-disabled={sendFile.isPending}
                                className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {sendFile.isPending ? (
                                    <Spinner />
                                ) : (
                                    <HugeiconsIcon icon={Attachment01Icon} />
                                )}
                                <span className="sr-only">
                                    {t("messaging.attachFile")}
                                </span>
                            </InputGroupButton>
                            <InputGroupButton
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-disabled={sendFile.isPending}
                                className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                                onClick={() => void recorder.start()}
                            >
                                <HugeiconsIcon icon={Mic01Icon} />
                                <span className="sr-only">
                                    {t("messaging.recordVoice")}
                                </span>
                            </InputGroupButton>
                        </InputGroupAddon>

                        <InputGroupInput
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                notifyTyping();
                            }}
                            placeholder={t("messaging.typePlaceholder")}
                            aria-label={t("messaging.sendMessage")}
                            maxLength={MAX_MESSAGE_LENGTH}
                            autoComplete="off"
                        />

                        <InputGroupAddon align="inline-end" className="py-1">
                            {inputValue.length > MAX_MESSAGE_LENGTH - 200 && (
                                <InputGroupText
                                    className={cn(
                                        "text-xs tabular-nums",
                                        inputValue.length >=
                                            MAX_MESSAGE_LENGTH &&
                                            "text-destructive",
                                    )}
                                >
                                    {t("messaging.charactersLeft", {
                                        count:
                                            MAX_MESSAGE_LENGTH -
                                            inputValue.length,
                                    })}
                                </InputGroupText>
                            )}
                            <InputGroupButton
                                type="submit"
                                size="icon-sm"
                                variant={canSend ? "default" : "ghost"}
                                aria-disabled={!canSend}
                                className={cn(
                                    "aria-disabled:pointer-events-none",
                                    !canSend && "text-muted-foreground",
                                    isSending && "cursor-progress",
                                )}
                            >
                                {isSending ? (
                                    <Spinner />
                                ) : (
                                    <HugeiconsIcon icon={SentIcon} />
                                )}
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
                    aria-label={t("messaging.attachFile")}
                    className="hidden"
                    onChange={handleFilePick}
                />
            </form>
        </div>
    );
}
