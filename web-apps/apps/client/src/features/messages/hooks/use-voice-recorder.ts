import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_RECORDING_MS = 120_000;
const TIMER_TICK_MS = 250;
const PREFERRED_MIME_TYPE = "audio/webm;codecs=opus";
const FALLBACK_MIME_TYPE = "audio/mp4";

export interface VoiceRecorderCallbacks {
    onRecordingComplete: (file: File) => void;
    onPermissionDenied: () => void;
    onRecordingUnsupported: () => void;
}

export function formatRecordingDuration(elapsedMs: number): string {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
}

function isRecordingSupported(): boolean {
    return (
        typeof MediaRecorder !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia
    );
}

function pickSupportedMimeType(): string {
    return MediaRecorder.isTypeSupported(PREFERRED_MIME_TYPE)
        ? PREFERRED_MIME_TYPE
        : FALLBACK_MIME_TYPE;
}

function voiceFileName(mimeType: string): string {
    const extension = mimeType.startsWith("audio/mp4") ? "m4a" : "webm";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `voice-message-${stamp}.${extension}`;
}

function releaseStream(stream: MediaStream): void {
    stream.getTracks().forEach((track) => track.stop());
}

export function useVoiceRecorder(callbacks: VoiceRecorderCallbacks) {
    const [isRecording, setIsRecording] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);
    const callbacksRef = useRef(callbacks);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const discardRef = useRef(false);
    const startedAtRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        callbacksRef.current = callbacks;
    });

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const stopAndSend = useCallback(() => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === "inactive") return;
        recorder.stop();
    }, []);

    const cancel = useCallback(() => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === "inactive") return;
        discardRef.current = true;
        recorder.stop();
    }, []);

    const start = useCallback(async () => {
        if (recorderRef.current) return;
        if (!isRecordingSupported()) {
            callbacksRef.current.onRecordingUnsupported();
            return;
        }

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
        } catch {
            callbacksRef.current.onPermissionDenied();
            return;
        }

        const mimeType = pickSupportedMimeType();
        let recorder: MediaRecorder;
        try {
            recorder = new MediaRecorder(stream, { mimeType });
        } catch {
            releaseStream(stream);
            callbacksRef.current.onRecordingUnsupported();
            return;
        }

        chunksRef.current = [];
        discardRef.current = false;
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
            releaseStream(stream);
            recorderRef.current = null;
            clearTimer();
            setIsRecording(false);
            setElapsedMs(0);
            const chunks = chunksRef.current;
            chunksRef.current = [];
            if (discardRef.current) return;
            const audio = new Blob(chunks, { type: mimeType });
            if (audio.size === 0) return;
            callbacksRef.current.onRecordingComplete(
                new File([audio], voiceFileName(mimeType), {
                    type: mimeType,
                }),
            );
        };

        recorderRef.current = recorder;
        startedAtRef.current = Date.now();
        setElapsedMs(0);
        setIsRecording(true);
        recorder.start();
        timerRef.current = setInterval(() => {
            const elapsed = Date.now() - startedAtRef.current;
            setElapsedMs(elapsed);
            if (elapsed >= MAX_RECORDING_MS) stopAndSend();
        }, TIMER_TICK_MS);
    }, [clearTimer, stopAndSend]);

    useEffect(() => {
        return () => {
            const recorder = recorderRef.current;
            if (recorder && recorder.state !== "inactive") {
                discardRef.current = true;
                recorder.stop();
            }
            clearTimer();
        };
    }, [clearTimer]);

    return { isRecording, elapsedMs, start, stopAndSend, cancel };
}
