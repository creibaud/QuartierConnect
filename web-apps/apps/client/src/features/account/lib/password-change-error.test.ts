import { describe, expect, it } from "vitest";
import { passwordChangeErrorKey } from "./password-change-error";

describe("passwordChangeErrorKey", () => {
    it("signale le mot de passe actuel quand l'API renvoie un 401 non-TOTP", () => {
        expect(
            passwordChangeErrorKey({
                status: 401,
                message: "Current password is incorrect",
            }),
        ).toBe("pages.account.currentPasswordWrong");
    });

    it("signale le code TOTP quand le 401 concerne le TOTP (via code)", () => {
        expect(
            passwordChangeErrorKey({ status: 401, code: "INVALID_TOTP" }),
        ).toBe("auth.errors.invalidTotpCheckApp");
    });

    it("signale le code TOTP quand le 401 concerne le TOTP (via message)", () => {
        expect(
            passwordChangeErrorKey({
                status: 401,
                message: "Invalid TOTP code",
            }),
        ).toBe("auth.errors.invalidTotpCheckApp");
    });

    it("affiche un message générique sur une erreur serveur (500)", () => {
        expect(passwordChangeErrorKey({ status: 500 })).toBe(
            "pages.account.passwordChangeFailed",
        );
    });

    it("affiche un message générique sur une panne réseau (sans statut)", () => {
        expect(passwordChangeErrorKey({ message: "Failed to fetch" })).toBe(
            "pages.account.passwordChangeFailed",
        );
    });
});
