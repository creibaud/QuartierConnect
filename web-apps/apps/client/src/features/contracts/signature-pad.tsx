import { useEffect, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@workspace/ui/components/button";

const PAD_HEIGHT = 160;

export function SignaturePad({
    value,
    onChange,
    clearLabel,
}: {
    value: string | null;
    onChange: (dataUrl: string | null) => void;
    clearLabel: string;
}) {
    const ref = useRef<SignatureCanvas>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    });

    // Match canvas resolution to display size and pixel density to keep strokes aligned.
    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        let lastWidth = 0;
        const fit = () => {
            const canvas = ref.current?.getCanvas();
            if (!canvas) return;
            const cssWidth = Math.round(wrap.clientWidth);
            if (cssWidth === 0 || cssWidth === lastWidth) return;
            lastWidth = cssWidth;
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = cssWidth * ratio;
            canvas.height = PAD_HEIGHT * ratio;
            canvas.style.width = `${cssWidth}px`;
            canvas.style.height = `${PAD_HEIGHT}px`;
            const ctx = canvas.getContext("2d");
            if (ctx) ctx.scale(ratio, ratio);
            ref.current?.clear();
            onChangeRef.current(null);
        };
        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(wrap);
        return () => observer.disconnect();
    }, []);

    function handleEnd() {
        const pad = ref.current;
        if (!pad || pad.isEmpty()) {
            onChange(null);
            return;
        }
        // Flatten onto opaque white so the PDF export carries no alpha channel.
        const source = pad.getCanvas();
        const flat = document.createElement("canvas");
        flat.width = source.width;
        flat.height = source.height;
        const ctx = flat.getContext("2d");
        if (!ctx) {
            onChange(source.toDataURL("image/png"));
            return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, flat.width, flat.height);
        ctx.drawImage(source, 0, 0);
        onChange(flat.toDataURL("image/png"));
    }

    function handleClear() {
        ref.current?.clear();
        onChange(null);
    }

    return (
        <div className="space-y-2">
            <div
                ref={wrapRef}
                className="overflow-hidden rounded-md border bg-white"
            >
                <SignatureCanvas
                    ref={ref}
                    onEnd={handleEnd}
                    penColor="#16181d"
                    backgroundColor="#ffffff"
                    canvasProps={{ className: "block touch-none" }}
                />
            </div>
            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClear}
                    disabled={!value}
                >
                    {clearLabel}
                </Button>
            </div>
        </div>
    );
}
