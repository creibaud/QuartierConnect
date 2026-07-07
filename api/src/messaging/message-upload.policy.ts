import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";
import { MessageType } from "./schemas/message.schema";

export const ACCEPTED_AUDIO_MIME_TYPES: readonly string[] = [
    "audio/webm",
    "audio/ogg",
    "audio/mpeg",
    "audio/mp4",
];

export const MAX_AUDIO_SIZE_BYTES = 5 * 1024 * 1024;

// MIME types safe to serve inline; SVG and text/HTML are excluded (script-capable).
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
    // SVG serves as an attachment (script-capable), never inline.
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
