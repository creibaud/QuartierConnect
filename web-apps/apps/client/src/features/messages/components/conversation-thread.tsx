import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Attachment01Icon, Mic01Icon, SentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    useMessages,
    useSendFileMessage,
    useSocketMessages,
} from "@workspace/shared/lib/hooks/useMessaging";
import type { Message } from "@workspace/shared/lib/types";
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble";
import { Button } from "@workspace/ui/components/button";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
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
import { toast } from "sonner";
import {
    formatRecordingDuration,
    useVoiceRecorder,
} from "@/features/messages/hooks/use-voice-recorder";
import { useTypingEmitter } from "@/features/realtime/use-typing-emitter";
import { MessageBubble } from "./message-bubble";

export function ConversationThread({
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
