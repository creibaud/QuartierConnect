import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Request,
    Res,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
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
import { SignContractDto } from "./dto/sign-contract.dto";

interface AuthRequest {
    user: { sub: string };
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
            "Returns all contracts where the user is the creator or a signatory.",
    })
    @ApiResponse({ status: 200, type: [ContractDto] })
    findAll(@Request() req: AuthRequest) {
        return this.contractsService.findAll(req.user.sub);
    }

    @Get(":id")
    @ApiOperation({ summary: "Contract details" })
    @ApiParam({ name: "id", description: "MongoDB ObjectId of the contract" })
    @ApiResponse({ status: 200, type: ContractDto })
    @ApiResponse({
        status: 403,
        description: "Access denied (creator or signatory only)",
    })
    @ApiResponse({ status: 404, description: "Contract not found" })
    findOne(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.contractsService.findOne(id, req.user.sub);
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
