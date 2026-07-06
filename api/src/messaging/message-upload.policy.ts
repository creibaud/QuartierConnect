import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";
import { MessageType } from "./schemas/message.schema";

export const ACCEPTED_AUDIO_MIME_TYPES: readonly string[] = [
    "audio/webm",
    "audio/ogg",
    "audio/mpeg",
    "audio/mp4",
];

export const MAX_AUDIO_SIZE_BYTES = 5 * 1024 * 1024;

// MIME types safe to serve inline from the API origin. SVG is deliberately
// absent (it can embed scripts), as is anything text/* or HTML-adjacent:
// everything else downloads as an attachment.
export const INLINE_SAFE_MIME_TYPES: readonly string[] = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    ...ACCEPTED_AUDIO_MIME_TYPES,
];

export function isInlineSafeMimeType(mimeType: string): boolean {
    return INLINE_SAFE_MIME_TYPES.includes(normalizeMimeType(mimeType));
}

export function resolveUploadMessageType(mimeType: string): MessageType {
    const baseMimeType = normalizeMimeType(mimeType);
    if (baseMimeType.startsWith("audio/")) {
        assertAcceptedAudioMimeType(baseMimeType);
        return MessageType.AUDIO;
    }
    // SVG is routed to FILE: served as an attachment (script-capable), it
    // would only render as a broken inline image bubble.
    if (baseMimeType === "image/svg+xml") return MessageType.FILE;
    if (baseMimeType.startsWith("image/")) return MessageType.IMAGE;
    return MessageType.FILE;
}

export function assertAudioSizeWithinLimit(sizeInBytes: number): void {
    if (sizeInBytes > MAX_AUDIO_SIZE_BYTES) {
        throw new PayloadTooLargeException({
            code: "AUDIO_TOO_LARGE",
            message: "Audio file exceeds the 5 MB limit",
        });
    }
}

function normalizeMimeType(mimeType: string): string {
    return mimeType.split(";")[0].trim().toLowerCase();
}

function assertAcceptedAudioMimeType(baseMimeType: string): void {
    if (!ACCEPTED_AUDIO_MIME_TYPES.includes(baseMimeType)) {
        throw new BadRequestException({
            code: "UNSUPPORTED_AUDIO_TYPE",
            message: `Unsupported audio type "${baseMimeType}". Accepted: ${ACCEPTED_AUDIO_MIME_TYPES.join(", ")}`,
        });
    }
}
