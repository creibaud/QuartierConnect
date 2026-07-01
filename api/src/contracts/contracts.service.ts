import * as crypto from "crypto";
import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { eq, inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Model } from "mongoose";
import { TotpService } from "../auth/totp.service";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { ContractDocumentsService } from "../documents/contract-documents.service";
import { ContractPdfData, PdfService } from "../documents/pdf.service";
import { PointsService } from "../points/points.service";
import { CreateContractDto } from "./dto/create-contract.dto";
import {
    Contract,
    ContractDocument,
    ContractStatus,
} from "./schemas/contract.schema";

@Injectable()
export class ContractsService {
    private readonly logger = new Logger(ContractsService.name);

    constructor(
        @InjectModel(Contract.name)
        private readonly contractModel: Model<ContractDocument>,
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
        private readonly totpService: TotpService,
        private readonly pointsService: PointsService,
        private readonly eventEmitter: EventEmitter2,
        private readonly pdfService: PdfService,
        private readonly contractDocs: ContractDocumentsService,
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
        await contract.save();
        try {
            const data = await this.buildPdfData(contract);
            const buf = await this.pdfService.generateBaseContractPdf(data);
            const { fileId } = await this.contractDocs.storePdf(
                String(contract._id),
                buf,
                "generated",
                p.createdBy,
            );
            contract.pdfFileId = fileId;
            await contract.save();
        } catch (err) {
            this.logger.warn(
                `PDF generation failed for contract ${String(contract._id)}: ${String(err)}`,
            );
        }
        return contract;
    }

    private async buildPdfData(
        contract: ContractDocument,
    ): Promise<ContractPdfData> {
        const [payerId, payeeId] = contract.signatories;
        const names = await this.resolveNames([payerId, payeeId]);
        return {
            title: contract.title,
            payerName: names[payerId] ?? payerId,
            payeeName: names[payeeId] ?? payeeId ?? "",
            pointsAmount: contract.pointsAmount ?? 0,
            date: new Date().toISOString().slice(0, 10),
            body: contract.content,
        };
    }

    private async resolveNames(ids: string[]): Promise<Record<string, string>> {
        const cleanIds = ids.filter((id): id is string => Boolean(id));
        if (cleanIds.length === 0) return {};

        const rows = await this.db
            .select({
                id: schema.users.id,
                firstName: schema.users.firstName,
                lastName: schema.users.lastName,
                email: schema.users.email,
            })
            .from(schema.users)
            .where(inArray(schema.users.id, cleanIds));
        const out: Record<string, string> = {};
        for (const r of rows) {
            out[r.id] =
                [r.firstName, r.lastName].filter(Boolean).join(" ").trim() ||
                r.email;
        }
        return out;
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

    async getContractPdf(
        id: string,
        userId: string,
    ): Promise<{ stream: NodeJS.ReadableStream; fileName: string }> {
        const contract = await this.findOne(id, userId); // enforces party access
        let res = await this.contractDocs.getPdfStream(id, userId);
        if (!res) {
            // lazy (re)generation when the PDF is missing
            try {
                const data = await this.buildPdfData(contract);
                const buf = await this.pdfService.generateBaseContractPdf(data);
                await this.contractDocs.storePdf(id, buf, "generated", userId);
                res = await this.contractDocs.getPdfStream(id, userId);
            } catch (err) {
                this.logger.warn(
                    `Lazy PDF regeneration failed for contract ${id}: ${String(err)}`,
                );
                throw new NotFoundException("PDF unavailable");
            }
        }
        if (!res) throw new NotFoundException("PDF unavailable");
        return res;
    }

    async getContractAudit(id: string, userId: string) {
        await this.findOne(id, userId); // party access
        return this.contractDocs.getAudit(id);
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

        // Best-effort PDF stamp — must never affect settlement/signature/status.
        if (contract.bookingId) {
            try {
                const zoneIndex = contract.signatories.indexOf(userId);
                const base = await this.contractDocs.getCurrentPdf(contractId);
                if (zoneIndex >= 0 && base) {
                    const names = await this.resolveNames([userId]);
                    const stamped = await this.pdfService.stampSignature(
                        base,
                        zoneIndex,
                        {
                            name: names[userId] ?? userId,
                            date: new Date().toISOString().slice(0, 10),
                            hash: hash.slice(0, 8),
                        },
                    );
                    const { fileId } = await this.contractDocs.storePdf(
                        contractId,
                        stamped,
                        "signed",
                        userId,
                    );
                    contract.pdfFileId = fileId;
                    await contract.save();
                }
            } catch (err) {
                this.logger.warn(
                    `PDF stamp failed for contract ${contractId}: ${String(err)}`,
                );
            }
        }

        if (willBeFullySigned && contract.bookingId) {
            this.eventEmitter.emit("contract.fully_signed", {
                contractId,
                bookingId: contract.bookingId,
            });
        }
        return saved;
    }
}
