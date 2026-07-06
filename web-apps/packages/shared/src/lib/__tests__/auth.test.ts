import { describe, expect, it } from "vitest";
import { decodeToken } from "../auth";
import type { TokenPayload } from "../auth";

function base64UrlEncode(value: string): string {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function buildToken(payload: Record<string, unknown>): string {
    const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const body = base64UrlEncode(JSON.stringify(payload));
    return `${header}.${body}.signature`;
}

const basePayload: TokenPayload = {
    sub: "user-1",
    email: "eloise@example.com",
    role: "resident",
    firstName: "Éloïse",
    lastName: "Müller",
    exp: 4102444800,
};

describe("decodeToken", () => {
    it("décode un payload avec prénom et nom accentués (UTF-8)", () => {
        const token = buildToken({ ...basePayload });

        const decoded = decodeToken(token);

        expect(decoded).not.toBeNull();
        expect(decoded?.firstName).toBe("Éloïse");
        expect(decoded?.lastName).toBe("Müller");
    });

    it("décode un payload dont le base64url contient - et _", () => {
        const payload = { ...basePayload, firstName: "Benoît", lastName: "Chloé" };
        const token = buildToken(payload);
        const encodedBody = token.split(".")[1];
        expect(/[-_]/.test(encodedBody)).toBe(true);

        const decoded = decodeToken(token);

        expect(decoded).not.toBeNull();
        expect(decoded?.firstName).toBe("Benoît");
        expect(decoded?.lastName).toBe("Chloé");
    });

    it("retourne les champs standards du payload", () => {
        const decoded = decodeToken(buildToken({ ...basePayload }));

        expect(decoded).toMatchObject({
            sub: "user-1",
            email: "eloise@example.com",
            role: "resident",
            exp: 4102444800,
        });
    });

    it("retourne null pour un token malformé", () => {
        expect(decodeToken("pas-un-jwt")).toBeNull();
        expect(decodeToken("")).toBeNull();
        expect(decodeToken("a.%%%.c")).toBeNull();
    });
});
