import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
    CONTRACT_FULLY_SIGNED_EVENT,
    ContractFullySignedEvent,
} from "../common/notification-events";
import { SocialService } from "./social.service";

@Injectable()
export class ContractHelpedListener {
    constructor(private readonly socialService: SocialService) {}

    @OnEvent(CONTRACT_FULLY_SIGNED_EVENT)
    async onContractFullySigned(
        event: ContractFullySignedEvent,
    ): Promise<void> {
        const { payerId, payeeId, serviceId } = event;
        if (!payerId || !payeeId || !serviceId) return;
        await this.socialService.recordHelpRendered({
            payerId,
            payeeId,
            serviceId,
            points: event.amount ?? 0,
        });
    }
}
