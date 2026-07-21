import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Request,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ContractsService } from "./contracts.service";
import { ContractDto } from "./dto/contract-response.dto";
import { CreateContractDto } from "./dto/create-contract.dto";
import { ImportContractBodyDto } from "./dto/import-contract.dto";
import { SignContractDto } from "./dto/sign-contract.dto";
import { MAX_IMPORT_PDF_BYTES } from "./lib/import-contract-fields";

interface AuthRequest {
    user: { sub: string; role: string };
}

@ApiTags("Contracts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("contracts")
export class ContractsController {
    constructor(private readonly contractsService: ContractsService) {}

    @Get()
    @ApiOperation({
        summary: "List my contracts (created or to be signed)",
        description:
            "Returns all contracts where the user is the creator or a signatory. Admins receive every contract as metadata only (no content or signature hashes) for platform oversight.",
    })
    @ApiResponse({ status: 200, type: [ContractDto] })
    findAll(@Request() req: AuthRequest) {
        return this.contractsService.findAll(req.user.sub, req.user.role);
    }

    @Get(":id")
    @ApiOperation({
        summary: "Contract details",
        description:
            "Full contract for the creator or a signatory. Admins who are not party to the contract receive metadata only (no content or signature hashes), matching the list view.",
    })
    @ApiParam({ name: "id", description: "MongoDB ObjectId of the contract" })
    @ApiResponse({ status: 200, type: ContractDto })
    @ApiResponse({
        status: 403,
        description: "Access denied (creator, signatory or admin only)",
    })
    @ApiResponse({ status: 404, description: "Contract not found" })
    findOne(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.contractsService.findOne(id, req.user.sub, req.user.role);
    }

    @Get(":id/pdf")
    @ApiOperation({ summary: "Download the contract PDF (audited as viewed)" })
    @ApiParam({ name: "id", description: "MongoDB ObjectId of the contract" })
    async getPdf(
        @Param("id") id: string,
        @Request() req: AuthRequest,
        @Res() res: Response,
    ) {
        const { stream, fileName } = await this.contractsService.getContractPdf(
            id,
            req.user.sub,
        );
        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${fileName}"`,
        });
        // A missing or corrupt GridFS file emits 'error'; without a listener the
        // unhandled event would crash the process, so fail this one request only.
        stream.on("error", () => {
            if (res.headersSent) res.destroy();
            else res.status(500).end();
        });
        stream.pipe(res);
    }

    @Get(":id/audit")
    @ApiOperation({ summary: "Immutable audit log of the contract document" })
    @ApiParam({ name: "id", description: "MongoDB ObjectId of the contract" })
    getAudit(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.contractsService.getContractAudit(id, req.user.sub);
    }

    @Post()
    @ApiOperation({
        summary: "Create a contract (SHA-256 hash auto-computed)",
        description:
            "Creates a contract. The `contentHash` is computed automatically (SHA-256 of the `content` field). Initial status: `draft`.",
    })
    @ApiResponse({ status: 201, type: ContractDto })
    create(@Body() dto: CreateContractDto, @Request() req: AuthRequest) {
        return this.contractsService.create(dto, req.user.sub);
    }

    @Post("import")
    @ApiOperation({
        summary: "Import a PDF contract with signature/initial zones",
        description:
            "Uploads an existing PDF (max 10 MB) and places signature or " +
            "initial zones on its pages. Zone coordinates are normalized " +
            "(0..1) relative to each page with a top-left origin. Every " +
            "signatory (1 to 4, caller included) needs at least one zone. " +
            "The uploaded file is archived as the immutable initial version " +
            "and follows the standard signing workflow.",
    })
    @ApiConsumes("multipart/form-data")
    @ApiBody({ type: ImportContractBodyDto })
    @ApiResponse({ status: 201, type: ContractDto })
    @ApiResponse({
        status: 400,
        description: "Invalid PDF file, signatories or zones",
    })
    @ApiResponse({ status: 413, description: "PDF larger than 10 MB" })
    @UseInterceptors(
        FileInterceptor("file", { limits: { fileSize: MAX_IMPORT_PDF_BYTES } }),
    )
    importPdf(
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: ImportContractBodyDto,
        @Request() req: AuthRequest,
    ) {
        return this.contractsService.importContract(file, dto, req.user.sub);
    }

    @Post(":id/sign")
    @ApiOperation({
        summary: "Sign a contract with TOTP validation",
        description:
            "Validates the user's TOTP code and adds their signature. Automatically switches to `fully_signed` status when all signatories have signed.",
    })
    @ApiParam({ name: "id", description: "MongoDB ObjectId of the contract" })
    @ApiResponse({
        status: 201,
        type: ContractDto,
        description: "Signature added",
    })
    @ApiResponse({
        status: 400,
        description:
            "Invalid TOTP code or contract already signed by this user",
    })
    @ApiResponse({
        status: 403,
        description: "User not listed as a signatory",
    })
    sign(
        @Param("id") id: string,
        @Body() dto: SignContractDto,
        @Request() req: AuthRequest,
    ) {
        return this.contractsService.sign(
            id,
            req.user.sub,
            dto.totpCode,
            dto.signatureImage,
        );
    }
}
