import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SignaturePad } from "../signature-pad";

const h = vi.hoisted(() => ({
    pad: { empty: true, dataUrl: "data:image/png;base64,DRAWN" },
    onEnd: { fn: null as null | (() => void) },
    cleared: { count: 0 },
}));

vi.mock("react-signature-canvas", async () => {
    const { forwardRef, useImperativeHandle } = await import("react");
    return {
        default: forwardRef(function MockCanvas(
            props: { onEnd?: () => void },
            ref,
        ) {
            // eslint-disable-next-line react-hooks/immutability -- test spy, not a real component
            h.onEnd.fn = props.onEnd ?? null;
            useImperativeHandle(ref, () => ({
                isEmpty: () => h.pad.empty,
                clear: () => {
                    h.cleared.count += 1;
                    h.pad.empty = true;
                },
                getCanvas: () => ({ toDataURL: () => h.pad.dataUrl }),
            }));
            return <div data-testid="pad" />;
        }),
    };
});

describe("SignaturePad", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        h.pad.empty = true;
        h.pad.dataUrl = "data:image/png;base64,DRAWN";
        h.onEnd.fn = null;
        h.cleared.count = 0;
    });

    it("emits the PNG data-URL when a stroke is drawn", () => {
        const onChange = vi.fn();
        h.pad.empty = false;
        render(
            <SignaturePad value={null} onChange={onChange} clearLabel="Effacer" />,
        );
        h.onEnd.fn?.();
        expect(onChange).toHaveBeenCalledWith("data:image/png;base64,DRAWN");
    });

    it("emits null when the pad is empty on stroke-end", () => {
        const onChange = vi.fn();
        h.pad.empty = true;
        render(
            <SignaturePad value={null} onChange={onChange} clearLabel="Effacer" />,
        );
        h.onEnd.fn?.();
        expect(onChange).toHaveBeenCalledWith(null);
    });

    it("clears and emits null when the Clear button is clicked", () => {
        const onChange = vi.fn();
        render(
            <SignaturePad
                value="data:image/png;base64,DRAWN"
                onChange={onChange}
                clearLabel="Effacer"
            />,
        );
        fireEvent.click(screen.getByText("Effacer"));
        expect(h.cleared.count).toBe(1);
        expect(onChange).toHaveBeenCalledWith(null);
    });
});
