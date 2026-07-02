import { Test, TestingModule } from "@nestjs/testing";
import { ContractFullySignedEvent } from "../common/notification-events";
import { ContractHelpedListener } from "./contract-helped.listener";
import { SocialService } from "./social.service";

const fullySignedEvent = (
    overrides: Partial<ContractFullySignedEvent> = {},
): ContractFullySignedEvent => ({
    contractId: "ct-1",
    bookingId: "bk-1",
    signatories: ["payer-1", "payee-1"],
    serviceTitle: "Aide au jardinage",
    amount: 12,
    payerId: "payer-1",
    payeeId: "payee-1",
    serviceId: "svc-1",
    ...overrides,
});

describe("ContractHelpedListener", () => {
    let listener: ContractHelpedListener;
    let socialService: { recordHelpRendered: jest.Mock };

    beforeEach(async () => {
        socialService = {
            recordHelpRendered: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContractHelpedListener,
                { provide: SocialService, useValue: socialService },
            ],
        }).compile();

        listener = module.get<ContractHelpedListener>(ContractHelpedListener);
    });

    it("records a HELPED relation from the fully-signed contract payload", async () => {
        await listener.onContractFullySigned(fullySignedEvent());

        expect(socialService.recordHelpRendered).toHaveBeenCalledWith({
            payerId: "payer-1",
            payeeId: "payee-1",
            serviceId: "svc-1",
            points: 12,
        });
    });

    it("defaults points to 0 when the payload carries no amount", async () => {
        await listener.onContractFullySigned(
            fullySignedEvent({ amount: undefined }),
        );

        expect(socialService.recordHelpRendered).toHaveBeenCalledWith(
            expect.objectContaining({ points: 0 }),
        );
    });

    it("skips when payerId is missing", async () => {
        await listener.onContractFullySigned(
            fullySignedEvent({ payerId: undefined }),
        );

        expect(socialService.recordHelpRendered).not.toHaveBeenCalled();
    });

    it("skips when payeeId is missing", async () => {
        await listener.onContractFullySigned(
            fullySignedEvent({ payeeId: undefined }),
        );

        expect(socialService.recordHelpRendered).not.toHaveBeenCalled();
    });

    it("skips when serviceId is missing", async () => {
        await listener.onContractFullySigned(
            fullySignedEvent({ serviceId: undefined }),
        );

        expect(socialService.recordHelpRendered).not.toHaveBeenCalled();
    });
});
