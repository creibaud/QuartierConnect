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
import { CreateEventDto } from "src/modules/events/dto/create-event.dto";
import { EventQueryDto } from "src/modules/events/dto/event-query.dto";
import { SwipeEventDto } from "src/modules/events/dto/swipe-event.dto";
import { UpdateEventDto } from "src/modules/events/dto/update-event.dto";
import { EventsService } from "src/modules/events/events.service";

const EVENT_EXAMPLE = {
    id: "507f1f77bcf86cd799439011",
    title: "Barbecue de printemps",
    category: "social",
    quartierId: "a3bb189e-8bf9-3888-9912-ace4e6543002",
    creatorId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
    startDate: "2026-04-15T14:00:00.000Z",
    registrationCount: 0,
    createdAt: "2026-03-27T10:00:00.000Z",
};

const REGISTRATION_EXAMPLE = {
    id: "507f1f77bcf86cd799439012",
    eventId: "507f1f77bcf86cd799439011",
    userId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
    registeredAt: "2026-03-27T10:00:00.000Z",
};

@ApiTags("Events")
@Controller("events")
@ApiBearerAuth("access-token")
export class EventsController {
    constructor(private readonly eventsService: EventsService) {}

    @Post()
    @ApiOperation({ summary: "Create a new event" })
    @ApiResponse({
        status: 201,
        description: "Event created successfully",
        schema: { example: EVENT_EXAMPLE },
    })
    @ApiResponse({
        status: 400,
        description: "Invalid payload",
        schema: {
            example: {
                statusCode: 400,
                message: "Validation failed",
                error: "Bad Request",
            },
        },
    })
    create(@CurrentUser() user: User, @Body() dto: CreateEventDto) {
        return this.eventsService.create(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: "List events with optional filters" })
    @ApiResponse({
        status: 200,
        description: "Paginated list of events",
        schema: {
            example: {
                data: [EVENT_EXAMPLE],
                meta: { total: 5, page: 1, limit: 10, totalPages: 1 },
            },
        },
    })
    findAll(@Query() query: EventQueryDto, @CurrentUser() user: User) {
        return this.eventsService.findAll(query, user.id);
    }

    @Get("swipe-next")
    @ApiOperation({ summary: "Get next event to swipe in the user's quartier" })
    @ApiResponse({
        status: 200,
        description: "Next event or null",
        schema: { example: EVENT_EXAMPLE },
    })
    getNextSwipe(
        @CurrentUser() user: User,
        @Query("quartierId") quartierId: string,
    ) {
        return this.eventsService.getNextSwipe(user.id, quartierId);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get event by ID" })
    @ApiResponse({
        status: 200,
        description: "Event found",
        schema: { example: EVENT_EXAMPLE },
    })
    @ApiResponse({
        status: 404,
        description: "Event not found",
        schema: {
            example: {
                statusCode: 404,
                message: "Event not found",
                error: "Not Found",
            },
        },
    })
    findOne(@Param("id") id: string) {
        return this.eventsService.findOne(id);
    }

    @Patch(":id")
    @ApiOperation({ summary: "Update an event" })
    @ApiResponse({
        status: 200,
        description: "Event updated successfully",
        schema: { example: EVENT_EXAMPLE },
    })
    @ApiResponse({
        status: 403,
        description: "Forbidden",
        schema: {
            example: {
                statusCode: 403,
                message: "Forbidden resource",
                error: "Forbidden",
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: "Event not found",
        schema: {
            example: {
                statusCode: 404,
                message: "Event not found",
                error: "Not Found",
            },
        },
    })
    update(
        @Param("id") id: string,
        @CurrentUser() user: User,
        @Body() dto: UpdateEventDto,
    ) {
        return this.eventsService.update(id, user.id, user.role, dto);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Delete an event" })
    @ApiResponse({ status: 204, description: "Event deleted" })
    @ApiResponse({
        status: 403,
        description: "Forbidden",
        schema: {
            example: {
                statusCode: 403,
                message: "Forbidden resource",
                error: "Forbidden",
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: "Event not found",
        schema: {
            example: {
                statusCode: 404,
                message: "Event not found",
                error: "Not Found",
            },
        },
    })
    delete(@Param("id") id: string, @CurrentUser() user: User) {
        return this.eventsService.delete(id, user.id, user.role);
    }

    @Post(":id/register")
    @ApiOperation({ summary: "Register for an event" })
    @ApiResponse({
        status: 201,
        description: "Registered successfully",
        schema: { example: REGISTRATION_EXAMPLE },
    })
    @ApiResponse({
        status: 400,
        description: "Event is full",
        schema: {
            example: {
                statusCode: 400,
                message: "Event is full",
                error: "Bad Request",
            },
        },
    })
    @ApiResponse({
        status: 409,
        description: "Already registered",
        schema: {
            example: {
                statusCode: 409,
                message: "Already registered for this event",
                error: "Conflict",
            },
        },
    })
    register(@Param("id") id: string, @CurrentUser() user: User) {
        return this.eventsService.register(id, user.id);
    }

    @Delete(":id/register")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Cancel registration for an event" })
    @ApiResponse({ status: 204, description: "Registration cancelled" })
    cancelRegistration(@Param("id") id: string, @CurrentUser() user: User) {
        return this.eventsService.cancelRegistration(id, user.id);
    }

    @Get(":id/registrations")
    @ApiOperation({ summary: "Get registrations for an event" })
    @ApiResponse({
        status: 200,
        description: "Paginated list of registrations",
        schema: {
            example: {
                data: [REGISTRATION_EXAMPLE],
                meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
            },
        },
    })
    getRegistrations(
        @Param("id") id: string,
        @Query() query: PaginationQueryDto,
    ) {
        return this.eventsService.getRegistrations(id, query);
    }

    @Post("swipe")
    @ApiOperation({ summary: "Swipe on an event (like or dislike)" })
    @ApiResponse({
        status: 201,
        description: "Swipe recorded",
        schema: {
            example: {
                eventId: "507f1f77bcf86cd799439011",
                userId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
                direction: "like",
            },
        },
    })
    swipe(@CurrentUser() user: User, @Body() dto: SwipeEventDto) {
        return this.eventsService.swipe(user.id, dto);
    }
}
