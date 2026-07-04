import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@workspace/ui/components/button";

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

    function handleEnd() {
        const pad = ref.current;
        if (!pad || pad.isEmpty()) {
            onChange(null);
            return;
        }
        // Aplati sur un fond blanc opaque : l'encre reste visible dans tous les
        // thèmes et l'export n'a pas de canal alpha « tout noir » qui virerait
        // en bloc noir une fois embarqué dans le PDF (pdf-lib).
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
            <div className="overflow-hidden rounded-md border bg-white">
                <SignatureCanvas
                    ref={ref}
                    onEnd={handleEnd}
                    penColor="#16181d"
                    backgroundColor="#ffffff"
                    canvasProps={{
                        width: 300,
                        height: 150,
                        className: "w-full touch-none",
                    }}
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
