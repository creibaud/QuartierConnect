import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";
import {
    ACCEPTED_AUDIO_MIME_TYPES,
    assertAudioSizeWithinLimit,
    MAX_AUDIO_SIZE_BYTES,
    resolveUploadMessageType,
} from "./message-upload.policy";
import { MessageType } from "./schemas/message.schema";

describe("resolveUploadMessageType", () => {
    it.each([...ACCEPTED_AUDIO_MIME_TYPES])(
        "returns AUDIO for whitelisted MIME %s",
        (mimeType) => {
            expect(resolveUploadMessageType(mimeType)).toBe(MessageType.AUDIO);
        },
    );

    it("returns AUDIO for audio/webm with a codecs parameter", () => {
        expect(resolveUploadMessageType("audio/webm;codecs=opus")).toBe(
            MessageType.AUDIO,
        );
    });

    it("normalizes case and surrounding whitespace", () => {
        expect(resolveUploadMessageType(" AUDIO/OGG ; codecs=vorbis")).toBe(
            MessageType.AUDIO,
        );
    });

    it.each(["audio/wav", "audio/x-flac", "audio/aac"])(
        "rejects non-whitelisted audio MIME %s with a 400",
        (mimeType) => {
            expect(() => resolveUploadMessageType(mimeType)).toThrow(
                BadRequestException,
            );
        },
    );

    it("returns IMAGE for image MIME types", () => {
        expect(resolveUploadMessageType("image/png")).toBe(MessageType.IMAGE);
    });

    it("returns FILE for any other MIME type", () => {
        expect(resolveUploadMessageType("application/pdf")).toBe(
            MessageType.FILE,
        );
    });
});

describe("assertAudioSizeWithinLimit", () => {
    it("accepts a file exactly at the 5 MB limit", () => {
        expect(() =>
            assertAudioSizeWithinLimit(MAX_AUDIO_SIZE_BYTES),
        ).not.toThrow();
    });

    it("rejects a file above the 5 MB limit with a 413", () => {
        expect(() =>
            assertAudioSizeWithinLimit(MAX_AUDIO_SIZE_BYTES + 1),
        ).toThrow(PayloadTooLargeException);
    });
});
