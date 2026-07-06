import { describe, expect, it } from "vitest";
import { resolveAuthErrorMessage } from "./server-error";

const messages = {
    INVALID_PASSWORD: "Email ou mot de passe incorrect",
    INVALID_TOTP: "Code TOTP invalide",
};

describe("resolveAuthErrorMessage", () => {
    it("renvoie le message traduit pour un code connu", () => {
        expect(
            resolveAuthErrorMessage("INVALID_PASSWORD", messages, "fallback"),
        ).toBe("Email ou mot de passe incorrect");
    });

    it("renvoie le repli générique pour un code inconnu", () => {
        expect(
            resolveAuthErrorMessage("SOMETHING_ELSE", messages, "fallback"),
        ).toBe("fallback");
    });

    it("renvoie le repli générique quand le code est absent", () => {
        expect(resolveAuthErrorMessage(undefined, messages, "fallback")).toBe(
            "fallback",
        );
    });
});
