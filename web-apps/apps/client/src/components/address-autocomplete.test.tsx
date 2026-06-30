import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddressAutocomplete } from "./address-autocomplete";

vi.mock("@workspace/shared/lib/api", () => ({
    apiGet: vi.fn().mockResolvedValue([{ label: "1 Rue X, Paris", lat: 48.85, lng: 2.35 }]),
}));

afterEach(() => vi.clearAllMocks());

describe("AddressAutocomplete", () => {
    it("fetches and selects a suggestion", async () => {
        const onChange = vi.fn();
        const onSelect = vi.fn();
        render(<AddressAutocomplete value="1 Rue" onChange={onChange} onSelect={onSelect} />);
        fireEvent.change(screen.getByRole("textbox"), { target: { value: "1 Rue X" } });
        const opt = await screen.findByText("1 Rue X, Paris");
        fireEvent.click(opt);
        expect(onSelect).toHaveBeenCalledWith({ label: "1 Rue X, Paris", lat: 48.85, lng: 2.35 });
        expect(onChange).toHaveBeenCalledWith("1 Rue X, Paris");
    });

    it("hides the dropdown when the value drops under 3 chars", async () => {
        const { rerender } = render(
            <AddressAutocomplete value="1 Rue" onChange={vi.fn()} onSelect={vi.fn()} />,
        );
        await screen.findByText("1 Rue X, Paris");
        rerender(<AddressAutocomplete value="1" onChange={vi.fn()} onSelect={vi.fn()} />);
        expect(screen.queryByText("1 Rue X, Paris")).toBeNull();
    });
});
