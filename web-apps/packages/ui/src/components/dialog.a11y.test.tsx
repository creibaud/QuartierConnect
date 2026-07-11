import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { render, screen } from "@testing-library/react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "./dialog";
import { Input } from "./input";
import { Label } from "./label";

// Radix portals the dialog outside the render container, so scan the dialog
// element itself. `violations` empty is the same assertion as
// `toHaveNoViolations` without depending on a custom matcher augmentation.
// color-contrast can't be evaluated under jsdom (no layout), so it only ever
// yields "incomplete" — disabling it keeps output clean without dropping any
// structural check (labels, roles, names, aria).
async function violationsOf(element: Element) {
    const results = await axe(element, {
        rules: { "color-contrast": { enabled: false } },
    });
    return results.violations;
}

describe("Dialog accessibility", () => {
    it("has no violations with a title and description", async () => {
        render(
            <Dialog open>
                <DialogContent>
                    <DialogTitle>Modifier le service</DialogTitle>
                    <DialogDescription>
                        Mettez à jour les informations du service.
                    </DialogDescription>
                </DialogContent>
            </Dialog>,
        );

        expect(await violationsOf(screen.getByRole("dialog"))).toEqual([]);
    });

    it("has no violations for a labelled form control inside the dialog", async () => {
        render(
            <Dialog open>
                <DialogContent>
                    <DialogTitle>Nouveau quartier</DialogTitle>
                    <DialogDescription>
                        Renseignez le nom du quartier.
                    </DialogDescription>
                    <Label htmlFor="neighborhood-name">Nom</Label>
                    <Input id="neighborhood-name" defaultValue="Centre" />
                </DialogContent>
            </Dialog>,
        );

        expect(await violationsOf(screen.getByRole("dialog"))).toEqual([]);
    });
});
