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
import { Model } from "mongoose";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
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

    // Residents AND moderators only reach events in their own quartier;
    // admins moderate across every neighborhood (same rule as services).
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
    @ApiQuery({ name: "page", required: false, example: "1" })
    @ApiQuery({ name: "limit", required: false, example: "20" })
    @ApiResponse({ status: 200, type: [EventDto] })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    findAll(
        @Query("category") category?: string,
        @Query("date") date?: string,
        @Query("page") page = "1",
        @Query("limit") limit = "20",
        // Default required by TS1016 (a required param can't follow the optional
        // @Query params); harmless because the neighborhood guard below rejects it.
        @Request() req: AuthRequest = { user: { sub: "", role: "" } },
    ) {
        // Only admins list across all neighborhoods; residents AND moderators
        // are scoped to their own. A scoped caller without a neighborhood gets
        // nothing — otherwise Mongoose would strip `neighborhoodId: undefined`
        // and leak every neighborhood's events (same rule as services).
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

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        return this.eventModel
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .exec();
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
        // Anti-spoofing: only admins may target another quartier; residents
        // and moderators always publish into their own.
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
        // Only admins may move an event to another quartier; the field is
        // silently ignored for everyone else (anti-spoofing).
        if (dto.neighborhoodId !== undefined && req.user.role === "admin")
            changes.neighborhoodId = dto.neighborhoodId;
        if (dto.location !== undefined)
            changes.location = {
                type: dto.location.type,
                coordinates: dto.location.coordinates,
            };
        if (dto.address !== undefined) {
            changes.address = dto.address;
            const location = await this.resolveLocation(
                dto.address,
                dto.location,
            );
            if (location) changes.location = location;
        }

        const updated = await this.eventModel
            .findByIdAndUpdate(String(id), { $set: changes }, { new: true })
            .exec();
        if (!updated) throw new NotFoundException("Event not found");
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
