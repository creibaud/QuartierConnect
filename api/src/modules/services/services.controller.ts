import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import type { User } from "src/database/drizzle/schema";
import { CreateServiceDto } from "src/modules/services/dto/create-service.dto";
import { RateServiceDto } from "src/modules/services/dto/rate-service.dto";
import { ServiceQueryDto } from "src/modules/services/dto/service-query.dto";
import { UpdateServiceDto } from "src/modules/services/dto/update-service.dto";
import { ServicesService } from "src/modules/services/services.service";

const SERVICE_EXAMPLE = {
    id: "507f1f77bcf86cd799439011",
    title: "Cours de jardinage",
    category: "education",
    type: "offer",
    status: "open",
    creatorId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
    quartierId: "a3bb189e-8bf9-3888-9912-ace4e6543002",
    durationMinutes: 60,
    createdAt: "2026-03-27T10:00:00.000Z",
};

const NOT_FOUND = {
    statusCode: 404,
    message: "Service not found",
    error: "Not Found",
};

const FORBIDDEN = {
    statusCode: 403,
    message: "Forbidden resource",
    error: "Forbidden",
};

@ApiTags("Services")
@Controller("services")
@ApiBearerAuth("access-token")
export class ServicesController {
    constructor(private readonly servicesService: ServicesService) {}

    @Post()
    @ApiOperation({ summary: "Create a new service offer" })
    @ApiResponse({
        status: 201,
        description: "Service created",
        schema: { example: SERVICE_EXAMPLE },
    })
    @ApiResponse({
        status: 400,
        description: "Validation error",
        schema: {
            example: {
                statusCode: 400,
                message: "Validation failed",
                error: "Bad Request",
            },
        },
    })
    create(@CurrentUser() user: User, @Body() dto: CreateServiceDto) {
        return this.servicesService.create(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: "List all services with filters" })
    @ApiResponse({
        status: 200,
        description: "Paginated service list",
        schema: {
            example: {
                data: [SERVICE_EXAMPLE],
                meta: { total: 10, page: 1, limit: 10, totalPages: 1 },
            },
        },
    })
    findAll(@Query() query: ServiceQueryDto) {
        return this.servicesService.findAll(query);
    }

    @Get("me")
    @ApiOperation({ summary: "List my services (created or accepted)" })
    @ApiResponse({
        status: 200,
        description: "Paginated list of my services",
        schema: {
            example: {
                data: [SERVICE_EXAMPLE],
                meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
            },
        },
    })
    findMine(@CurrentUser() user: User, @Query() query: PaginationQueryDto) {
        return this.servicesService.findMine(user.id, query);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a service by ID" })
    @ApiResponse({
        status: 200,
        description: "Service found",
        schema: { example: SERVICE_EXAMPLE },
    })
    @ApiResponse({
        status: 404,
        description: "Service not found",
        schema: { example: NOT_FOUND },
    })
    findOne(@Param("id") id: string) {
        return this.servicesService.findOne(id);
    }

    @Patch(":id")
    @ApiOperation({ summary: "Update a service (creator only, status open)" })
    @ApiResponse({
        status: 200,
        description: "Service updated",
        schema: { example: SERVICE_EXAMPLE },
    })
    @ApiResponse({
        status: 400,
        description: "Service not open",
        schema: {
            example: {
                statusCode: 400,
                message: "Service is not open",
                error: "Bad Request",
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: "Not the creator",
        schema: { example: FORBIDDEN },
    })
    @ApiResponse({
        status: 404,
        description: "Service not found",
        schema: { example: NOT_FOUND },
    })
    update(
        @Param("id") id: string,
        @CurrentUser() user: User,
        @Body() dto: UpdateServiceDto,
    ) {
        return this.servicesService.update(id, user.id, dto);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Delete a service (creator only, status open)" })
    @ApiResponse({ status: 204, description: "Service deleted" })
    @ApiResponse({
        status: 400,
        description: "Service not open",
        schema: {
            example: {
                statusCode: 400,
                message: "Service is not open",
                error: "Bad Request",
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: "Not the creator",
        schema: { example: FORBIDDEN },
    })
    @ApiResponse({
        status: 404,
        description: "Service not found",
        schema: { example: NOT_FOUND },
    })
    delete(@Param("id") id: string, @CurrentUser() user: User) {
        return this.servicesService.delete(id, user.id);
    }

    @Post(":id/accept")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Accept a service offer" })
    @ApiResponse({
        status: 200,
        description: "Service accepted",
        schema: { example: { ...SERVICE_EXAMPLE, status: "accepted" } },
    })
    @ApiResponse({
        status: 400,
        description: "Cannot accept own service or service not open",
        schema: {
            example: {
                statusCode: 400,
                message: "Cannot accept own service",
                error: "Bad Request",
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: "Service not found",
        schema: { example: NOT_FOUND },
    })
    accept(@Param("id") id: string, @CurrentUser() user: User) {
        return this.servicesService.accept(id, user.id);
    }

    @Post(":id/complete")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Mark a service as completed" })
    @ApiResponse({
        status: 200,
        description: "Service completed",
        schema: { example: { ...SERVICE_EXAMPLE, status: "completed" } },
    })
    @ApiResponse({
        status: 400,
        description: "Service not accepted or insufficient balance",
        schema: {
            example: {
                statusCode: 400,
                message: "Service not accepted or insufficient balance",
                error: "Bad Request",
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: "Not creator or acceptor",
        schema: { example: FORBIDDEN },
    })
    @ApiResponse({
        status: 404,
        description: "Service not found",
        schema: { example: NOT_FOUND },
    })
    complete(@Param("id") id: string, @CurrentUser() user: User) {
        return this.servicesService.complete(id, user.id);
    }

    @Post(":id/cancel")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Cancel a service" })
    @ApiResponse({
        status: 200,
        description: "Service cancelled",
        schema: { example: { ...SERVICE_EXAMPLE, status: "cancelled" } },
    })
    @ApiResponse({
        status: 400,
        description: "Service cannot be cancelled",
        schema: {
            example: {
                statusCode: 400,
                message: "Service cannot be cancelled",
                error: "Bad Request",
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: "Not creator or acceptor",
        schema: { example: FORBIDDEN },
    })
    @ApiResponse({
        status: 404,
        description: "Service not found",
        schema: { example: NOT_FOUND },
    })
    cancel(@Param("id") id: string, @CurrentUser() user: User) {
        return this.servicesService.cancel(id, user.id);
    }

    @Post(":id/rate")
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: "Rate a completed service" })
    @ApiResponse({
        status: 201,
        description: "Rating submitted",
        schema: {
            example: {
                serviceId: "507f1f77bcf86cd799439011",
                raterId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
                rating: 5,
                comment: "Super service, très professionnel",
                createdAt: "2026-03-27T10:00:00.000Z",
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: "Service not completed",
        schema: {
            example: {
                statusCode: 400,
                message: "Service not completed",
                error: "Bad Request",
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: "Not creator or acceptor",
        schema: { example: FORBIDDEN },
    })
    @ApiResponse({
        status: 404,
        description: "Service not found",
        schema: { example: NOT_FOUND },
    })
    @ApiResponse({
        status: 409,
        description: "Already rated",
        schema: {
            example: {
                statusCode: 409,
                message: "Already rated this service",
                error: "Conflict",
            },
        },
    })
    rate(
        @Param("id") id: string,
        @CurrentUser() user: User,
        @Body() dto: RateServiceDto,
    ) {
        return this.servicesService.rate(id, user.id, dto);
    }
}
