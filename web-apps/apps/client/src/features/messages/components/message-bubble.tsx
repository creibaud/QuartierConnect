import { useTranslation } from "react-i18next";
import type { Message } from "@workspace/shared/lib/types";
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble";
import {
    MessageContent,
    MessageFooter,
    Message as MessageRow,
} from "@workspace/ui/components/message";
import { cn } from "@workspace/ui/lib/utils";
import { AuthedAudio } from "./authed-audio";
import { AuthedImage } from "./authed-image";
import { MessageFileAttachment } from "./message-file-attachment";

export function MessageBubble({
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
                    variant={isMedia ? "muted" : isOutgoing ? "default" : "muted"}
                    align={align}
                >
                    <BubbleContent className={cn(isMedia && "p-1.5")}>
                        {isImage ? (
                            <AuthedImage
                                fileId={message.fileId!}
                                alt={message.fileName ?? t("messaging.imageAlt")}
                            />
                        ) : isAudio ? (
                            <AuthedAudio fileId={message.fileId!} />
                        ) : isFile ? (
                            <MessageFileAttachment message={message} />
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
