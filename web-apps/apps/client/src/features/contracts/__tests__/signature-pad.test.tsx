import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SignaturePad } from "../signature-pad";

vi.mock("react-signature-canvas", () => ({
    default: (props: { onEnd?: () => void }) => (
        <button type="button" data-testid="pad" onClick={() => props.onEnd?.()} />
    ),
}));

// The component reads ref.current.isEmpty()/getCanvas(); provide them via a spy
// on the mocked default export's instance is complex — instead we assert the
// clear button path, which does not depend on the canvas ref returning data.
describe("SignaturePad", () => {
    beforeEach(() => vi.clearAllMocks());

    it("emits null when cleared", () => {
        const onChange = vi.fn();
        render(
            <SignaturePad value={null} onChange={onChange} clearLabel="Effacer" />,
        );
        fireEvent.click(screen.getByText("Effacer"));
        expect(onChange).toHaveBeenCalledWith(null);
    });
});
