import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { render } from "@testing-library/react";
import { AddressAutocomplete } from "./address-autocomplete";

// An empty value keeps the debounced geocoding effect from firing, so the
// render is synchronous and deterministic.
vi.mock("@workspace/shared/lib/api", () => ({ apiGet: vi.fn() }));

describe("AddressAutocomplete accessibility", () => {
    it("has no violations when the field is labelled", async () => {
        const { container } = render(
            <div>
                <label htmlFor="address-field">Adresse</label>
                <AddressAutocomplete
                    id="address-field"
                    value=""
                    onChange={vi.fn()}
                    onSelect={vi.fn()}
                />
            </div>,
        );

        // color-contrast can't be evaluated under jsdom (no layout), so it
        // only ever yields "incomplete"; disabling it keeps output clean
        // without dropping any structural check.
        const results = await axe(container, {
            rules: { "color-contrast": { enabled: false } },
        });
        expect(results.violations).toEqual([]);
    });
});
