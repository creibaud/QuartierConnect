// NOTE: packages/ui vitest has no jest-dom setup — use plain truthiness, not
// matchers like toBeInTheDocument.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { useAppForm } from "../lib/form";

function EmailFieldHarness() {
    const form = useAppForm({ defaultValues: { email: "" } });
    return (
        <form.AppField name="email">
            {(field) => (
                <field.TextField
                    label="Email"
                    type="email"
                    autoComplete="email"
                />
            )}
        </form.AppField>
    );
}

function BareFieldHarness() {
    const form = useAppForm({ defaultValues: { firstName: "" } });
    return (
        <form.AppField name="firstName">
            {(field) => <field.TextField label="Prénom" />}
        </form.AppField>
    );
}

describe("TextField", () => {
    it("forwards the field name and autocomplete hint to the input", () => {
        render(<EmailFieldHarness />);
        const input = screen.getByLabelText("Email");
        expect(input.getAttribute("name")).toBe("email");
        expect(input.getAttribute("autocomplete")).toBe("email");
    });

    it("omits autocomplete when no hint is provided", () => {
        render(<BareFieldHarness />);
        const input = screen.getByLabelText("Prénom");
        expect(input.getAttribute("name")).toBe("firstName");
        expect(input.getAttribute("autocomplete")).toBeNull();
    });
});
