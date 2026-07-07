// No jest-dom setup here — assert with plain truthiness, not toBeInTheDocument.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "./dialog";

function renderOpenDialog(closeLabel?: string) {
    render(
        <Dialog open>
            <DialogContent closeLabel={closeLabel}>
                <DialogTitle>Titre</DialogTitle>
                <DialogDescription>Description</DialogDescription>
            </DialogContent>
        </Dialog>,
    );
}

describe("DialogContent", () => {
    it("labels the close button in French by default", () => {
        renderOpenDialog();
        expect(screen.getByRole("button", { name: "Fermer" })).toBeTruthy();
    });

    it("uses the provided close label", () => {
        renderOpenDialog("Quitter");
        expect(screen.getByRole("button", { name: "Quitter" })).toBeTruthy();
    });
});
