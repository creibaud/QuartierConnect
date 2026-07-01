import * as crypto from "crypto";
import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Model } from "mongoose";
import { TotpService } from "../auth/totp.service";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { PointsService } from "../points/points.service";
import { CreateContractDto } from "./dto/create-contract.dto";
import {
    Contract,
    ContractDocument,
    ContractStatus,
} from "./schemas/contract.schema";

@Injectable()
export class ContractsService {
    constructor(
        @InjectModel(Contract.name)
        private readonly contractModel: Model<ContractDocument>,
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
        private readonly totpService: TotpService,
        private readonly pointsService: PointsService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    findAll(userId: string) {
        return this.contractModel
            .find({
                $or: [{ createdBy: userId }, { signatories: userId }],
            })
            .sort({ createdAt: -1 })
            .exec();
    }

    async findOne(id: string, userId: string) {
        const contract = await this.contractModel.findById(id).exec();
        if (!contract) throw new NotFoundException("Contract not found");

        const hasAccess =
            contract.createdBy === userId ||
            contract.signatories.includes(userId);
        if (!hasAccess) throw new ForbiddenException("Access denied");

        if (
            contract.bookingId &&
            contract.status !== ContractStatus.FULLY_SIGNED &&
            (await this.pointsService.isServicePaymentCompleted(
                String(contract._id),
            ))
        ) {
            contract.status = ContractStatus.FULLY_SIGNED;
            if (!contract.signedAt) contract.signedAt = new Date();
            try {
                await contract.save();
            } catch {
                // best-effort reconciliation: persistence is retried on the
                // next read
            }
        }
        return contract;
    }

    async create(dto: CreateContractDto, userId: string) {
        const hash = crypto
            .createHash("sha256")
            .update(dto.content)
            .digest("hex");

        const contract = new this.contractModel({
            title: dto.title,
            content: dto.content,
            createdBy: userId,
            signatories: dto.signatories ?? [],
            status: ContractStatus.DRAFT,
            contentHash: hash,
        });
        return contract.save();
    }

    async createServiceContract(p: {
        title: string;
        content: string;
        serviceId: string;
        bookingId: string;
        signatories: string[];
        pointsAmount: number;
        createdBy: string;
    }): Promise<ContractDocument> {
        const hash = crypto
            .createHash("sha256")
            .update(p.content)
            .digest("hex");
        const contract = new this.contractModel({
            title: p.title,
            content: p.content,
            createdBy: p.createdBy,
            signatories: p.signatories,
            status: ContractStatus.DRAFT,
            contentHash: hash,
            serviceId: p.serviceId,
            bookingId: p.bookingId,
            pointsAmount: p.pointsAmount,
        });
        return contract.save();
    }

    async cancelContract(id: string): Promise<void> {
        const contract = await this.contractModel.findById(id).exec();
        if (!contract) return;
        if (contract.status === ContractStatus.FULLY_SIGNED) {
            throw new BadRequestException(
                "A fully-signed contract cannot be cancelled",
            );
        }
        contract.status = ContractStatus.CANCELLED;
        await contract.save();
    }

    async sign(id: string, userId: string, totpCode: string) {
        const contract = await this.contractModel.findById(id).exec();
        if (!contract) throw new NotFoundException("Contract not found");
        if (contract.status === ContractStatus.CANCELLED) {
            throw new BadRequestException("Contract is cancelled");
        }
        if (!contract.signatories.includes(userId)) {
            throw new ForbiddenException("Not a signatory of this contract");
        }
        if (contract.signatures.some((s) => s.userId === userId)) {
            throw new BadRequestException("Already signed");
        }

        const [user] = await this.db
            .select({ totpSecret: schema.users.totpSecret })
            .from(schema.users)
            .where(eq(schema.users.id, userId))
            .limit(1);
        if (!user) throw new NotFoundException("User not found");
        if (!this.totpService.verify(user.totpSecret, totpCode)) {
            throw new BadRequestException("Invalid TOTP code");
        }

        const signerIds = new Set(contract.signatures.map((s) => s.userId));
        signerIds.add(userId);
        const willBeFullySigned = contract.signatories.every((s) =>
            signerIds.has(s),
        );
        const contractId = String(contract._id);

        // Money-critical: settle BEFORE persisting the final signature so a
        // `fully_signed` service contract can never exist without payment.
        if (willBeFullySigned && contract.bookingId) {
            await this.pointsService.completeServicePayment(contractId);
        }

        const hash = crypto
            .createHash("sha256")
            .update(contract.content + userId + new Date().toISOString())
            .digest("hex");
        contract.signatures.push({ userId, signedAt: new Date(), hash });
        if (willBeFullySigned) {
            contract.status = ContractStatus.FULLY_SIGNED;
            contract.signedAt = new Date();
        } else {
            contract.status = ContractStatus.PARTIAL;
        }
        const saved = await contract.save();

        if (willBeFullySigned && contract.bookingId) {
            this.eventEmitter.emit("contract.fully_signed", {
                contractId,
                bookingId: contract.bookingId,
            });
        }
        return saved;
    }
}
