import { TotpService } from "./totp.service";

describe("TotpService", () => {
    let service: TotpService;

    beforeEach(() => {
        service = new TotpService();
    });

    describe("generateSecret", () => {
        it("returns a base32 secret and otpauthUrl", () => {
            const result = service.generateSecret("test@demo.fr");
            expect(result.secret).toBeTruthy();
            expect(result.secret.length).toBeGreaterThan(10);
            expect(result.otpauthUrl).toContain("otpauth://totp/");
            expect(result.otpauthUrl).toContain("QuartierConnect");
        });

        it("includes the email in the otpauthUrl", () => {
            const result = service.generateSecret("alice@demo.fr");
            expect(result.otpauthUrl).toContain("alice%40demo.fr");
        });

        it("generates unique secrets on each call", () => {
            const a = service.generateSecret("a@demo.fr");
            const b = service.generateSecret("a@demo.fr");
            expect(a.secret).not.toBe(b.secret);
        });
    });

    describe("generateQrCodeDataUrl", () => {
        it("returns a data URL string for a valid otpauth URL", async () => {
            const { otpauthUrl } = service.generateSecret("test@demo.fr");
            const dataUrl = await service.generateQrCodeDataUrl(otpauthUrl);
            expect(dataUrl).toMatch(/^data:image\/png;base64,/);
        });
    });

    describe("verify", () => {
        it("returns false for an obviously wrong token", () => {
            const { secret } = service.generateSecret("test@demo.fr");
            expect(service.verify(secret, "000000")).toBe(false);
        });

        it("returns true for a valid current TOTP code", () => {
            const speakeasy = require("speakeasy");
            const { secret } = service.generateSecret("test@demo.fr");
            const validToken = speakeasy.totp({ secret, encoding: "base32" });
            expect(service.verify(secret, validToken)).toBe(true);
        });

        it("returns false for an expired token outside window", () => {
            const speakeasy = require("speakeasy");
            const { secret } = service.generateSecret("test@demo.fr");
            const expiredToken = speakeasy.totp({
                secret,
                encoding: "base32",
                time: Math.floor(Date.now() / 1000) - 120,
            });
            expect(service.verify(secret, expiredToken)).toBe(false);
        });
    });
});
