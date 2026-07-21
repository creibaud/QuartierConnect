import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Request,
    Res,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateServiceDto } from "./dto/create-service.dto";
import { ServiceDto } from "./dto/service-response.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { ServicesService } from "./services.service";

interface AuthRequest {
    user: { sub: string; role: string; neighborhoodId?: string | null };
}

@ApiTags("Services")
@Controller("services")
export class ServicesController {
    constructor(private readonly servicesService: ServicesService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "List services",
        description:
            "Returns service listings scoped to the caller's neighborhood, filterable by category, type, and direction.",
    })
    @ApiQuery({
        name: "category",
        required: false,
        example: "gardening",
        description: "Service category",
    })
    @ApiQuery({
        name: "type",
        required: false,
        enum: ["free", "paid", "exchange"],
        description: "Service type",
    })
    @ApiQuery({
        name: "direction",
        required: false,
        enum: ["offer", "request"],
        description: "Service direction",
    })
    @ApiQuery({
        name: "search",
        required: false,
        example: "tonte",
        description: "Case-insensitive substring on title or description",
    })
    @ApiQuery({
        name: "sort",
        required: false,
        enum: ["createdAt", "title"],
        description: "Sort field (default: createdAt)",
    })
    @ApiQuery({
        name: "order",
        required: false,
        enum: ["asc", "desc"],
        description: "Sort direction (default: desc)",
    })
    @ApiQuery({ name: "page", required: false, example: "1" })
    @ApiQuery({ name: "limit", required: false, example: "20" })
    @ApiResponse({ status: 200, type: [ServiceDto] })
    async findAll(
        // @Res goes first: a required param can't follow optional @Query params (TS1016).
        @Res({ passthrough: true }) res: Response,
        @Query("category") category?: string,
        @Query("type") type?: string,
        @Query("direction") direction?: string,
        @Query("search") search?: string,
        @Query("sort") sort?: string,
        @Query("order") order?: string,
        @Query("page") page = "1",
        @Query("limit") limit = "20",
        @Request() req: AuthRequest = { user: { sub: "", role: "" } },
    ) {
        return this.servicesService.findAll(
            res,
            category,
            type,
            direction,
            search,
            sort,
            order,
            page,
            limit,
            req.user,
        );
    }

    @Get("mine")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "My service listings with responders" })
    @ApiResponse({
        status: 200,
        description: "Own services enriched with responders",
    })
    async findMine(@Request() req: AuthRequest) {
        return this.servicesService.findMine(req.user);
    }

    @Get("responded")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Services the current user has responded to" })
    @ApiResponse({ status: 200, type: [ServiceDto] })
    async findResponded(@Request() req: AuthRequest) {
        return this.servicesService.findResponded(req.user);
    }

    @Get(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Service details" })
    @ApiParam({
        name: "id",
        description: "MongoDB ID of the service",
        example: "664f1a2b3c4d5e6f7a8b9c0d",
    })
    @ApiResponse({ status: 200, type: ServiceDto })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    @ApiResponse({
        status: 403,
        description: "Service outside the caller's neighborhood",
    })
    @ApiResponse({ status: 404, description: "Service not found" })
    async findOne(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.servicesService.findOne(id, req.user);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Create a service listing",
        description:
            "Creates a service listing. The `createdBy` field is automatically populated from the JWT. For non-admin callers the provided `neighborhoodId` is ignored and replaced by the caller's own neighborhood.",
    })
    @ApiResponse({
        status: 201,
        type: ServiceDto,
        description: "Service created",
    })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    async create(@Body() dto: CreateServiceDto, @Request() req: AuthRequest) {
        return this.servicesService.create(dto, req.user);
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Update a service",
        description:
            "The owner or an admin can update it. `neighborhoodId` changes are admin-only and silently ignored otherwise.",
    })
    @ApiParam({ name: "id", description: "MongoDB ID of the service" })
    @ApiResponse({
        status: 200,
        type: ServiceDto,
        description: "Service updated",
    })
    @ApiResponse({
        status: 403,
        description: "Access denied (owner or admin only)",
    })
    @ApiResponse({ status: 404, description: "Service not found" })
    async update(
        @Param("id") id: string,
        @Body() dto: UpdateServiceDto,
        @Request() req: AuthRequest,
    ) {
        return this.servicesService.update(id, dto, req.user);
    }

    @Post(":id/respond")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Respond to a service listing (idempotent)" })
    @ApiParam({ name: "id", description: "MongoDB ID of the service" })
    @ApiResponse({ status: 201, schema: { example: { status: "ok" } } })
    @ApiResponse({ status: 403, description: "Cannot respond to own service" })
    @ApiResponse({ status: 404, description: "Service not found" })
    async respond(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.servicesService.respond(id, req.user);
    }

    @Delete(":id/respond")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Withdraw response from a service listing" })
    @ApiParam({ name: "id", description: "MongoDB ID of the service" })
    @ApiResponse({ status: 200, schema: { example: { status: "ok" } } })
    async unrespond(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.servicesService.unrespond(id, req.user);
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Delete a service",
        description:
            "The owner or an admin can delete it. Deletion is refused (409) while a pending or accepted booking references the service — bookings must be declined, cancelled, or completed first.",
    })
    @ApiParam({ name: "id", description: "MongoDB ID of the service" })
    @ApiResponse({
        status: 200,
        schema: { example: { success: true } },
        description: "Service deleted",
    })
    @ApiResponse({
        status: 403,
        description: "Access denied (owner or admin only)",
    })
    @ApiResponse({ status: 404, description: "Service not found" })
    @ApiResponse({
        status: 409,
        description:
            "The service still has active (pending or accepted) bookings",
    })
    async remove(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.servicesService.remove(id, req.user);
    }
}
