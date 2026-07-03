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
import { PDFDocument } from "pdf-lib";
import { TotpService } from "../auth/totp.service";
import {
    CONTRACT_FULLY_SIGNED_EVENT,
    CONTRACT_SIGNED_EVENT,
    ContractFullySignedEvent,
    ContractSignedEvent,
} from "../common/notification-events";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { ContractDocumentsService } from "../documents/contract-documents.service";
import {
    ContractPdfData,
    PdfService,
    SignatureStamp,
} from "../documents/pdf.service";
import { PointsService } from "../points/points.service";
import { CreateContractDto } from "./dto/create-contract.dto";
import { ImportContractBodyDto } from "./dto/import-contract.dto";
import { formatFrenchDate } from "./lib/format";
import {
    MAX_IMPORT_PDF_BYTES,
    parseSignatories,
    parseSignatureZones,
} from "./lib/import-contract-fields";
import {
    Contract,
    ContractDocument,
    ContractSource,
    ContractStatus,
    SignatureZone,
} from "./schemas/contract.schema";

const PDF_MAGIC_BYTES = "%PDF-";

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

    async importContract(
        file: Express.Multer.File | undefined,
        dto: ImportContractBodyDto,
        userId: string,
    ): Promise<ContractDocument> {
        const pdf = this.assertPdfUpload(file);
        const signatories = parseSignatories(dto.signatories, userId);
        const zones = parseSignatureZones(dto.zones, signatories);
        await this.assertSignatoriesExist(signatories);
        await this.assertZonesFitDocument(pdf.buffer, zones);

        const contract = new this.contractModel({
            title: dto.title,
            content: `Document importé : ${pdf.originalname}`,
            createdBy: userId,
            signatories,
            status: ContractStatus.DRAFT,
            contentHash: this.pdfService.sha256(pdf.buffer),
            source: ContractSource.IMPORTED,
            zones,
        });
        await contract.save();

        try {
            const { fileId } = await this.contractDocs.storePdf(
                String(contract._id),
                pdf.buffer,
                "imported",
                userId,
            );
            contract.pdfFileId = fileId;
            return await contract.save();
        } catch (err) {
            await this.contractModel
                .deleteOne({ _id: contract._id })
                .exec()
                .catch(() => undefined);
            throw err;
        }
    }

    private assertPdfUpload(
        file: Express.Multer.File | undefined,
    ): Express.Multer.File {
        if (!file) throw new BadRequestException("No file provided");
        if (file.mimetype !== "application/pdf") {
            throw new BadRequestException(
                "Only application/pdf files are accepted",
            );
        }
        if (file.size > MAX_IMPORT_PDF_BYTES) {
            throw new BadRequestException("PDF exceeds the 10 MB limit");
        }
        const magic = file.buffer
            .subarray(0, PDF_MAGIC_BYTES.length)
            .toString();
        if (magic !== PDF_MAGIC_BYTES) {
            throw new BadRequestException("File is not a valid PDF");
        }
        return file;
    }

    private async assertSignatoriesExist(ids: string[]): Promise<void> {
        const names = await this.resolveNames(ids);
        const unknown = ids.filter((id) => !names[id]);
        if (unknown.length > 0) {
            throw new BadRequestException(
                `Unknown signatories: ${unknown.join(", ")}`,
            );
        }
    }

    private async assertZonesFitDocument(
        pdf: Buffer,
        zones: SignatureZone[],
    ): Promise<void> {
        let pageCount: number;
        try {
            const doc = await PDFDocument.load(pdf);
            pageCount = doc.getPageCount();
        } catch {
            throw new BadRequestException("Unreadable PDF file");
        }
        const maxZonePage = Math.max(...zones.map((zone) => zone.page));
        if (maxZonePage > pageCount) {
            throw new BadRequestException(
                `Zone page ${maxZonePage} exceeds the document page count (${pageCount})`,
            );
        }
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
            date: formatFrenchDate(new Date()),
            body: contract.content,
        };
    }

    async resolveNames(ids: string[]): Promise<Record<string, string>> {
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
            if (contract.source === ContractSource.IMPORTED) {
                // The uploaded file is the single source of truth: an
                // imported contract is never rebuilt from the template.
                throw new NotFoundException("PDF unavailable");
            }
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

    async sign(
        id: string,
        userId: string,
        totpCode: string,
        signatureImage?: string,
    ) {
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
            .select({
                totpSecret: schema.users.totpSecret,
                firstName: schema.users.firstName,
                lastName: schema.users.lastName,
                email: schema.users.email,
            })
            .from(schema.users)
            .where(eq(schema.users.id, userId))
            .limit(1);
        if (!user) throw new NotFoundException("User not found");
        if (!this.totpService.verify(user.totpSecret, totpCode)) {
            throw new BadRequestException("Invalid TOTP code");
        }
        const signerName =
            [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
            user.email;

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

        this.eventEmitter.emit(CONTRACT_SIGNED_EVENT, {
            contractId,
            signerId: userId,
            signatories: [...contract.signatories],
            bookingId: contract.bookingId ?? undefined,
            serviceTitle: contract.title,
            amount: contract.pointsAmount ?? undefined,
            actorName: signerName,
        } satisfies ContractSignedEvent);

        await this.stampSignedPdf(contract, userId, hash, signatureImage);

        if (willBeFullySigned && contract.bookingId) {
            const [payerId, payeeId] = contract.signatories;
            this.eventEmitter.emit(CONTRACT_FULLY_SIGNED_EVENT, {
                contractId,
                bookingId: contract.bookingId,
                signatories: [...contract.signatories],
                serviceTitle: contract.title,
                amount: contract.pointsAmount ?? undefined,
                payerId,
                payeeId,
                serviceId: contract.serviceId ?? undefined,
            } satisfies ContractFullySignedEvent);
        }
        return saved;
    }

    // Best-effort PDF stamp — must never affect settlement/signature/status.
    // Contracts with placement zones (imported PDFs) are stamped at every
    // zone of the signer; legacy service contracts keep the fixed zones.
    private async stampSignedPdf(
        contract: ContractDocument,
        userId: string,
        signatureHash: string,
        signatureImage?: string,
    ): Promise<void> {
        const contractId = String(contract._id);
        const signerZones = (contract.zones ?? []).filter(
            (zone) => zone.signerId === userId,
        );
        if (signerZones.length === 0 && !contract.bookingId) return;

        try {
            const base = await this.contractDocs.getCurrentPdf(contractId);
            if (!base) return;
            const names = await this.resolveNames([userId]);
            const stamp: SignatureStamp = {
                name: names[userId] ?? userId,
                date: formatFrenchDate(new Date()),
                hash: signatureHash.slice(0, 8),
                image: signatureImage,
            };
            const stamped =
                signerZones.length > 0
                    ? await this.pdfService.stampSignatureAtZones(
                          base,
                          signerZones,
                          stamp,
                      )
                    : await this.pdfService.stampSignature(
                          base,
                          contract.signatories.indexOf(userId),
                          stamp,
                      );
            const { fileId } = await this.contractDocs.storePdf(
                contractId,
                stamped,
                "signed",
                userId,
            );
            contract.pdfFileId = fileId;
            await contract.save();
        } catch (err) {
            this.logger.warn(
                `PDF stamp failed for contract ${contractId}: ${String(err)}`,
            );
        }
    }
}
