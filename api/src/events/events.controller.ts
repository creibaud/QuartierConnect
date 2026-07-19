import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    HttpCode,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
    Request,
    Res,
    UseGuards,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import { Model } from "mongoose";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
    escapeRegex,
    parsePagination,
    resolveSort,
    setPageHeaders,
} from "../common/pagination";
import { GeocodingService } from "../geocoding/geocoding.service";
import { SocialService } from "../social/social.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { EventInterestDto } from "./dto/event-interest.dto";
import { EventDto, EventInterestResponseDto } from "./dto/event-response.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { Event, EventDocument } from "./schemas/event.schema";

interface AuthRequest {
    user: { sub: string; role: string; neighborhoodId?: string | null };
}

@ApiTags("Events")
@Controller("events")
export class EventsController {
    constructor(
        @InjectModel(Event.name)
        private readonly eventModel: Model<EventDocument>,
        private readonly socialService: SocialService,
        private readonly geocoding: GeocodingService,
    ) {}

    // Non-admins are scoped to their own neighborhood; admins see all.
    private assertNeighborhoodScope(
        event: { neighborhoodId?: string | null },
        req: AuthRequest,
    ): void {
        if (req.user.role === "admin") return;
        const eventNeighborhood = event.neighborhoodId?.toString() ?? null;
        if (eventNeighborhood !== (req.user.neighborhoodId ?? null)) {
            throw new ForbiddenException("Event outside your neighborhood");
        }
    }

    private async resolveLocation(
        address?: string,
        location?: { type: "Point"; coordinates: [number, number] },
    ): Promise<{ type: "Point"; coordinates: [number, number] } | undefined> {
        if (location) return location;
        if (!address) return undefined;
        const geo = await this.geocoding.geocode(address);
        return geo
            ? { type: "Point", coordinates: [geo.lng, geo.lat] }
            : undefined;
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "List events",
        description:
            "Returns community events scoped to the caller's neighborhood (admins see every neighborhood), filterable by category and date (YYYY-MM-DD format — returns all events for the day).",
    })
    @ApiQuery({
        name: "category",
        required: false,
        example: "culture",
        description: "Event category",
    })
    @ApiQuery({
        name: "date",
        required: false,
        example: "2026-05-15",
        description: "ISO date YYYY-MM-DD (filters over the entire day)",
    })
    @ApiQuery({
        name: "search",
        required: false,
        example: "brocante",
        description: "Case-insensitive substring on title",
    })
    @ApiQuery({
        name: "sort",
        required: false,
        enum: ["createdAt", "date", "title"],
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
    @ApiResponse({ status: 200, type: [EventDto] })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    async findAll(
        // @Res goes first: a required param can't follow optional @Query params (TS1016).
        @Res({ passthrough: true }) res: Response,
        @Query("category") category?: string,
        @Query("date") date?: string,
        @Query("search") search?: string,
        @Query("sort") sort?: string,
        @Query("order") order?: string,
        @Query("page") page = "1",
        @Query("limit") limit = "20",
        @Request() req: AuthRequest = { user: { sub: "", role: "" } },
    ) {
        // Scoped caller without a neighborhood gets nothing: an undefined
        // neighborhoodId filter would be stripped and leak every neighborhood.
        const isAdmin = req.user.role === "admin";
        if (!isAdmin && !req.user.neighborhoodId) return [];
        const filter: Record<string, unknown> = {};
        if (!isAdmin) filter.neighborhoodId = req.user.neighborhoodId;
        if (category) filter.category = String(category);
        if (date) {
            const from = new Date(date);
            const to = new Date(date);
            to.setDate(to.getDate() + 1);
            filter.date = { $gte: from, $lt: to };
        }
        if (typeof search === "string" && search.trim()) {
            filter.title = new RegExp(escapeRegex(search.trim()), "i");
        }

        const { limitNum, skip } = parsePagination(page, limit);
        const { field, direction } = resolveSort(
            sort,
            order,
            ["createdAt", "date", "title"] as const,
            "createdAt",
        );
        const sortSpec: Record<string, 1 | -1> = {
            [field]: direction === "asc" ? 1 : -1,
        };
        const [events, total] = await Promise.all([
            this.eventModel
                .find(filter)
                .sort(sortSpec)
                .skip(skip)
                .limit(limitNum)
                .exec(),
            this.eventModel.countDocuments(filter),
        ]);
        setPageHeaders(res, total, limitNum);
        return events;
    }

    @Get(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Event details" })
    @ApiParam({
        name: "id",
        description: "MongoDB ID of the event",
        example: "664f1a2b3c4d5e6f7a8b9c0e",
    })
    @ApiResponse({ status: 200, type: EventDto })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    @ApiResponse({
        status: 403,
        description: "Event outside the caller's neighborhood",
    })
    @ApiResponse({ status: 404, description: "Event not found" })
    async findOne(@Param("id") id: string, @Request() req: AuthRequest) {
        const event = await this.eventModel.findById(id).exec();
        if (!event) throw new NotFoundException("Event not found");
        this.assertNeighborhoodScope(event, req);
        return event;
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Create an event",
        description:
            "Creates a community event. `createdBy` is automatically populated from the JWT. For non-admin callers the provided `neighborhoodId` is ignored and replaced by the caller's own neighborhood.",
    })
    @ApiResponse({ status: 201, type: EventDto, description: "Event created" })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    async create(@Body() dto: CreateEventDto, @Request() req: AuthRequest) {
        const location = await this.resolveLocation(dto.address, dto.location);
        // Anti-spoofing: only admins may target another neighborhood.
        const neighborhoodId =
            req.user.role === "admin"
                ? (dto.neighborhoodId ?? req.user.neighborhoodId ?? undefined)
                : (req.user.neighborhoodId ?? undefined);
        const created = await this.eventModel.create({
            ...dto,
            location,
            neighborhoodId,
            createdBy: req.user.sub,
        });
        void this.socialService.syncEvent(
            created._id.toString(),
            created.title,
            created.date,
            created.neighborhoodId?.toString(),
            created.createdBy,
        );
        return created;
    }

    @Post(":id/interest")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Mark interest or participation in an event",
        description:
            "Adds the current user to `interestedUserIds` (idempotent via `$addToSet`; `interested: false` removes them) and records the matching Neo4j relationship (INTERESTED_IN for `source: swipe`, ATTENDING for `source: participate`, NOT_INTERESTED_IN when not interested). The Neo4j write is best-effort and never blocks the response.",
    })
    @ApiParam({ name: "id", description: "MongoDB ID of the event" })
    @ApiBody({ type: EventInterestDto, required: false })
    @ApiResponse({ status: 201, type: EventInterestResponseDto })
    @ApiResponse({ status: 404, description: "Event not found" })
    async markInterest(
        @Param("id") id: string,
        @Request() req: AuthRequest,
        @Body() body?: EventInterestDto,
    ) {
        const interested = body?.interested ?? true;
        const source = body?.source ?? "swipe";
        const membershipUpdate = interested
            ? { $addToSet: { interestedUserIds: req.user.sub } }
            : { $pull: { interestedUserIds: req.user.sub } };
        const event = await this.eventModel
            .findByIdAndUpdate(id, membershipUpdate, { new: true })
            .exec();

        if (!event) throw new NotFoundException("Event not found");
        void this.socialService.recordEventInterest(req.user.sub, id, {
            interested,
            source,
        });
        return { interested: event.interestedUserIds.length };
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Update an event",
        description:
            "The owner or an admin can update it. `neighborhoodId` changes are admin-only and silently ignored otherwise.",
    })
    @ApiParam({ name: "id", description: "MongoDB ID of the event" })
    @ApiResponse({
        status: 200,
        type: EventDto,
        description: "Event updated",
    })
    @ApiResponse({
        status: 403,
        description: "Access denied (owner or admin only)",
    })
    @ApiResponse({ status: 404, description: "Event not found" })
    async update(
        @Param("id") id: string,
        @Body() dto: UpdateEventDto,
        @Request() req: AuthRequest,
    ) {
        const event = await this.eventModel.findById(id).exec();
        if (!event) throw new NotFoundException("Event not found");
        if (event.createdBy !== req.user.sub && req.user.role !== "admin") {
            throw new ForbiddenException("You can only update your own events");
        }

        const changes: Record<string, unknown> = {};
        if (dto.title !== undefined) changes.title = dto.title;
        if (dto.description !== undefined)
            changes.description = dto.description;
        if (dto.category !== undefined) changes.category = dto.category;
        if (dto.date !== undefined) changes.date = dto.date;
        // Anti-spoofing: only admins may move an event to another neighborhood.
        if (dto.neighborhoodId !== undefined && req.user.role === "admin")
            changes.neighborhoodId = dto.neighborhoodId;
        if (dto.location !== undefined)
            changes.location = {
                type: dto.location.type,
                coordinates: dto.location.coordinates,
            };
        if (dto.address !== undefined) {
            changes.address = dto.address;
            // Failed geocoding clears the pin rather than keeping a stale position.
            changes.location =
                (await this.resolveLocation(dto.address, dto.location)) ?? null;
        }

        const updated = await this.eventModel
            .findByIdAndUpdate(
                String(id),
                { $set: changes },
                { new: true, runValidators: true },
            )
            .exec();
        if (!updated) throw new NotFoundException("Event not found");
        // Keep the Neo4j projection in sync after every edit.
        void this.socialService.syncEvent(
            updated._id.toString(),
            updated.title,
            updated.date,
            updated.neighborhoodId?.toString(),
            updated.createdBy,
        );
        return updated;
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(204)
    @ApiOperation({ summary: "Delete an event" })
    @ApiParam({ name: "id", description: "MongoDB ID of the event" })
    @ApiResponse({ status: 204, description: "Event deleted" })
    @ApiResponse({
        status: 403,
        description: "Access denied (owner or admin only)",
    })
    @ApiResponse({ status: 404, description: "Event not found" })
    async remove(@Param("id") id: string, @Request() req: AuthRequest) {
        const event = await this.eventModel.findById(id).exec();
        if (!event) throw new NotFoundException("Event not found");
        if (event.createdBy !== req.user.sub && req.user.role !== "admin") {
            throw new ForbiddenException("You can only delete your own events");
        }
        await this.eventModel.findByIdAndDelete(id).exec();
    }
}
