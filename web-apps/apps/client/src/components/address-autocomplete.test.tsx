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
    });
});
