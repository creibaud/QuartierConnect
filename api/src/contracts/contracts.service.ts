import * as crypto from "crypto";
import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Model } from "mongoose";
import { TotpService } from "../auth/totp.service";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
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

    async sign(id: string, userId: string, totpCode: string) {
        const contract = await this.contractModel.findById(id).exec();
        if (!contract) throw new NotFoundException("Contract not found");

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

        const isValid = this.totpService.verify(user.totpSecret, totpCode);
        if (!isValid) throw new BadRequestException("Invalid TOTP code");

        const hash = crypto
            .createHash("sha256")
            .update(contract.content + userId + new Date().toISOString())
            .digest("hex");

        contract.signatures.push({ userId, signedAt: new Date(), hash });

        const allSigned = contract.signatories.every((s) =>
            contract.signatures.some((sig) => sig.userId === s),
        );

        if (allSigned) {
            contract.status = ContractStatus.SIGNED;
            contract.signedAt = new Date();
        } else {
            contract.status = ContractStatus.PENDING_SIGNATURE;
        }

        return contract.save();
    }
}
