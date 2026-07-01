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
        onChange(pad.getCanvas().toDataURL("image/png"));
    }

    function handleClear() {
        ref.current?.clear();
        onChange(null);
    }

    return (
        <div className="space-y-2">
            <div className="bg-background rounded-md border">
                <SignatureCanvas
                    ref={ref}
                    onEnd={handleEnd}
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
