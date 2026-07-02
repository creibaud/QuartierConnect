import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";
import { MessageType } from "./schemas/message.schema";

export const ACCEPTED_AUDIO_MIME_TYPES: readonly string[] = [
    "audio/webm",
    "audio/ogg",
    "audio/mpeg",
    "audio/mp4",
];

export const MAX_AUDIO_SIZE_BYTES = 5 * 1024 * 1024;

export function resolveUploadMessageType(mimeType: string): MessageType {
    const baseMimeType = normalizeMimeType(mimeType);
    if (baseMimeType.startsWith("audio/")) {
        assertAcceptedAudioMimeType(baseMimeType);
        return MessageType.AUDIO;
    }
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
