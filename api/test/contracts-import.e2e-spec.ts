import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PDFDocument } from "pdf-lib";
import * as speakeasy from "speakeasy";
import request from "supertest";
import { AppModule } from "../src/app.module";

const DEMO_PASSWORD = "Demo1234!";

// 64x32 transparent PNG with a black signature-like stroke.
const SIGNATURE_PNG_DATA_URL =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAAoUlEQVR42u2YQQ7AIAgE/f+n6b2HpioZFt1JempKlxWjMIYxxhiMeD3XJq5iQlQnX2lCVBgw865KE+5yhQkyyePlSCcfYsLwfa8mUK70SYHo6qsJ/YwZgi63NCC6xspctbbVtPszfN9mx8gwoP2JctrZvfTdKbe3ZV0zV1iyiUH7ij+JqXZwabrUe3hEl/IUB9OlOsdDdalOcq+dMBtj8ngAlf+/QZqk6iAAAAAASUVORK5CYII=";

// TOTP codes are single-use across the whole app. To stay clear of the
// shared replay guard the offsets differ per action: u1 logs in at the
// current window (0), u2 logs in at the previous one (-30), and both sign
// with the next window (+30) so a signer never replays a login code.
function currentTotp(secret: string, timeOffsetSeconds = 0): string {
    return speakeasy.totp({
        secret,
        encoding: "base32",
        time: Math.floor(Date.now() / 1000) + timeOffsetSeconds,
    });
}

async function registerAndLogin(
    app: INestApplication,
    email: string,
    loginOffsetSeconds = 0,
): Promise<{ accessToken: string; totpSecret: string; userId: string }> {
    const regRes = await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email, password: DEMO_PASSWORD, consent: true })
        .expect(201);

    const urlParams = new URL(
        regRes.body.otpauthUrl.replace("otpauth://", "http://"),
    );
    const totpSecret = urlParams.searchParams.get("secret")!;

    const loginRes = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
            email,
            password: DEMO_PASSWORD,
            totpCode: currentTotp(totpSecret, loginOffsetSeconds),
        })
        .expect(200);

    const payload = JSON.parse(
        Buffer.from(
            loginRes.body.accessToken.split(".")[1],
            "base64url",
        ).toString(),
    ) as { sub: string };

    return {
        accessToken: loginRes.body.accessToken as string,
        totpSecret,
        userId: payload.sub,
    };
}

async function buildTwoPagePdf(): Promise<Buffer> {
    const doc = await PDFDocument.create();
    doc.addPage([595.28, 841.89]).drawText("Accord de voisinage — page 1", {
        x: 60,
        y: 780,
        size: 14,
    });
    doc.addPage([595.28, 841.89]).drawText("Signatures — page 2", {
        x: 60,
        y: 780,
        size: 14,
    });
    return Buffer.from(await doc.save());
}

describe("Contracts import (e2e)", () => {
    let app: INestApplication;
    let user1: Awaited<ReturnType<typeof registerAndLogin>>;
    let user2: Awaited<ReturnType<typeof registerAndLogin>>;
    let pdfBuffer: Buffer;
    let contractId: string;

    const zonesFor = (signer1: string, signer2: string) =>
        JSON.stringify([
            {
                page: 1,
                x: 0.1,
                y: 0.78,
                w: 0.32,
                h: 0.09,
                signerId: signer1,
                kind: "signature",
            },
            {
                page: 2,
                x: 0.86,
                y: 0.92,
                w: 0.1,
                h: 0.05,
                signerId: signer1,
                kind: "initials",
            },
            {
                page: 2,
                x: 0.55,
                y: 0.78,
                w: 0.32,
                h: 0.09,
                signerId: signer2,
                kind: "signature",
            },
        ]);

    function importRequest() {
        return request(app.getHttpServer())
            .post("/contracts/import")
            .set("Authorization", `Bearer ${user1.accessToken}`);
    }

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();

        const ts = Date.now();
        user1 = await registerAndLogin(app, `e2e-import-u1-${ts}@test.fr`);
        user2 = await registerAndLogin(app, `e2e-import-u2-${ts}@test.fr`, -30);
        pdfBuffer = await buildTwoPagePdf();
    }, 60000);

    afterAll(async () => {
        await app.close();
    });

    describe("POST /contracts/import", () => {
        it("returns 401 without a token", async () => {
            await request(app.getHttpServer())
                .post("/contracts/import")
                .field("title", "x")
                .expect(401);
        });

        it("rejects a non-PDF upload", async () => {
            await importRequest()
                .field("title", "Pas un PDF")
                .field("signatories", JSON.stringify([user1.userId]))
                .field(
                    "zones",
                    JSON.stringify([
                        {
                            page: 1,
                            x: 0.1,
                            y: 0.8,
                            w: 0.3,
                            h: 0.08,
                            signerId: user1.userId,
                            kind: "signature",
                        },
                    ]),
                )
                .attach("file", Buffer.from("plain text"), {
                    filename: "notes.txt",
                    contentType: "text/plain",
                })
                .expect(400);
        });

        it("rejects signatories that exclude the caller", async () => {
            await importRequest()
                .field("title", "Sans l'appelant")
                .field("signatories", JSON.stringify([user2.userId]))
                .field("zones", zonesFor(user2.userId, user2.userId))
                .attach("file", pdfBuffer, {
                    filename: "accord.pdf",
                    contentType: "application/pdf",
                })
                .expect(400);
        });

        it("rejects zones that leave a signatory without one", async () => {
            await importRequest()
                .field(
                    "signatories",
                    JSON.stringify([user1.userId, user2.userId]),
                )
                .field("title", "Zone manquante")
                .field(
                    "zones",
                    JSON.stringify([
                        {
                            page: 1,
                            x: 0.1,
                            y: 0.8,
                            w: 0.3,
                            h: 0.08,
                            signerId: user1.userId,
                            kind: "signature",
                        },
                    ]),
                )
                .attach("file", pdfBuffer, {
                    filename: "accord.pdf",
                    contentType: "application/pdf",
                })
                .expect(400);
        });

        it("rejects a zone pointing past the last page", async () => {
            await importRequest()
                .field("title", "Page hors limites")
                .field("signatories", JSON.stringify([user1.userId]))
                .field(
                    "zones",
                    JSON.stringify([
                        {
                            page: 3,
                            x: 0.1,
                            y: 0.8,
                            w: 0.3,
                            h: 0.08,
                            signerId: user1.userId,
                            kind: "signature",
                        },
                    ]),
                )
                .attach("file", pdfBuffer, {
                    filename: "accord.pdf",
                    contentType: "application/pdf",
                })
                .expect(400);
        });

        it("imports a PDF with zones for both signatories", async () => {
            const res = await importRequest()
                .field("title", "Accord de voisinage importé")
                .field(
                    "signatories",
                    JSON.stringify([user1.userId, user2.userId]),
                )
                .field("zones", zonesFor(user1.userId, user2.userId))
                .attach("file", pdfBuffer, {
                    filename: "accord.pdf",
                    contentType: "application/pdf",
                })
                .expect(201);

            expect(res.body._id).toBeTruthy();
            expect(res.body.source).toBe("imported");
            expect(res.body.status).toBe("draft");
            expect(res.body.zones).toHaveLength(3);
            expect(res.body.contentHash).toMatch(/^[a-f0-9]{64}$/);
            expect(res.body.pdfFileId).toBeTruthy();
            contractId = res.body._id as string;
        });
    });

    describe("signing an imported contract", () => {
        it("u1 signs with a drawn signature — status becomes partial", async () => {
            const res = await request(app.getHttpServer())
                .post(`/contracts/${contractId}/sign`)
                .set("Authorization", `Bearer ${user1.accessToken}`)
                .send({
                    totpCode: currentTotp(user1.totpSecret, 30),
                    signatureImage: SIGNATURE_PNG_DATA_URL,
                })
                .expect(201);

            expect(res.body.status).toBe("partial");
            expect(res.body.signatures).toHaveLength(1);
        });

        it("u2 signs — status becomes fully_signed", async () => {
            const res = await request(app.getHttpServer())
                .post(`/contracts/${contractId}/sign`)
                .set("Authorization", `Bearer ${user2.accessToken}`)
                .send({ totpCode: currentTotp(user2.totpSecret, 30) })
                .expect(201);

            expect(res.body.status).toBe("fully_signed");
            expect(res.body.signatures).toHaveLength(2);
        });
    });

    describe("archived document and audit trail", () => {
        it("serves the stamped PDF, still a 2-page document", async () => {
            const res = await request(app.getHttpServer())
                .get(`/contracts/${contractId}/pdf`)
                .set("Authorization", `Bearer ${user1.accessToken}`)
                .buffer(true)
                .parse((response, callback) => {
                    const chunks: Buffer[] = [];
                    response.on("data", (chunk: Buffer) => chunks.push(chunk));
                    response.on("end", () =>
                        callback(null, Buffer.concat(chunks)),
                    );
                })
                .expect(200);

            const stamped = res.body as Buffer;
            expect(stamped.subarray(0, 5).toString()).toBe("%PDF-");
            expect(stamped.equals(pdfBuffer)).toBe(false);
            const doc = await PDFDocument.load(stamped);
            expect(doc.getPageCount()).toBe(2);
        });

        it("audits imported, both signatures and the download", async () => {
            const res = await request(app.getHttpServer())
                .get(`/contracts/${contractId}/audit`)
                .set("Authorization", `Bearer ${user2.accessToken}`)
                .expect(200);

            const actions = (res.body as { action: string }[]).map(
                (entry) => entry.action,
            );
            expect(actions.filter((a) => a === "imported")).toHaveLength(1);
            expect(actions.filter((a) => a === "signed")).toHaveLength(2);
            expect(actions).toContain("viewed");

            const imported = (
                res.body as { action: string; sha256?: string }[]
            ).find((entry) => entry.action === "imported");
            expect(imported?.sha256).toMatch(/^[a-f0-9]{64}$/);
        });
    });
});
