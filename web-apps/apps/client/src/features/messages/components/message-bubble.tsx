import { useTranslation } from "react-i18next";
import type { Message } from "@workspace/shared/lib/types";
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble";
import {
    MessageContent,
    MessageFooter,
    MessageHeader,
    Message as MessageRow,
} from "@workspace/ui/components/message";
import { cn } from "@workspace/ui/lib/utils";
import { AuthedAudio } from "./authed-audio";
import { AuthedImage } from "./authed-image";
import { MessageFileAttachment } from "./message-file-attachment";

export function MessageBubble({
    message,
    isOutgoing,
    showTime,
    startsBurst,
    senderName,
    isPending = false,
}: {
    message: Message;
    isOutgoing: boolean;
    showTime: boolean;
    startsBurst: boolean;
    senderName?: string;
    isPending?: boolean;
}) {
    const { t, i18n } = useTranslation();
    const created = new Date(message.createdAt);
    const time = created.toLocaleTimeString(i18n.language, {
        hour: "2-digit",
        minute: "2-digit",
    });
    const fullDateTime = new Intl.DateTimeFormat(i18n.language, {
        dateStyle: "long",
        timeStyle: "short",
    }).format(created);

    const isImage = message.type === "image" && !!message.fileId;
    const isAudio = message.type === "audio" && !!message.fileId;
    const isFile = message.type === "file" && !!message.fileId;
    const isMedia = isImage || isAudio || isFile;
    const align = isOutgoing ? "end" : "start";

    return (
        <MessageRow align={align}>
            <MessageContent className="gap-1">
                {senderName && !isOutgoing && startsBurst && (
                    <MessageHeader>{senderName}</MessageHeader>
                )}
                <Bubble
                    variant={isOutgoing ? "outgoing" : "incoming"}
                    align={align}
                    className={cn(isPending && "opacity-60")}
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
                            <MessageFileAttachment message={message} />
                        ) : (
                            <span className="flex items-end gap-2">
                                <span className="min-w-0 whitespace-pre-wrap">
                                    {message.content ?? ""}
                                </span>
                                <time
                                    dateTime={message.createdAt}
                                    aria-hidden={showTime ? undefined : "true"}
                                    aria-label={
                                        showTime
                                            ? t("messaging.sentAt", {
                                                  time: fullDateTime,
                                              })
                                            : undefined
                                    }
                                    className={cn(
                                        "shrink-0 translate-y-px text-[0.6875rem] leading-none tabular-nums transition-opacity motion-reduce:transition-none",
                                        isOutgoing
                                            ? "text-bubble-out-meta"
                                            : "text-bubble-in-meta",
                                        showTime
                                            ? "opacity-100"
                                            : "opacity-0 group-hover/message:opacity-100",
                                    )}
                                >
                                    {time}
                                </time>
                            </span>
                        )}
                    </BubbleContent>
                </Bubble>
                {isMedia && showTime && (
                    <MessageFooter>
                        <time
                            dateTime={message.createdAt}
                            aria-label={t("messaging.sentAt", {
                                time: fullDateTime,
                            })}
                            className="tabular-nums"
                        >
                            {time}
                        </time>
                    </MessageFooter>
                )}
            </MessageContent>
        </MessageRow>
    );
}
