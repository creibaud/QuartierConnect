import {
    Body,
    Controller,
    Delete,
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
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { Model } from "mongoose";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SocialService } from "../social/social.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { EventDto, EventInterestResponseDto } from "./dto/event-response.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { Event, EventDocument } from "./schemas/event.schema";

interface AuthRequest {
    user: { sub: string; role: string };
}

@ApiTags("Events")
@Controller("events")
export class EventsController {
    constructor(
        @InjectModel(Event.name)
        private readonly eventModel: Model<EventDocument>,
        private readonly socialService: SocialService,
    ) {}

    @Get()
    @ApiOperation({
        summary: "List events",
        description:
            "Returns community events, filterable by category and date (YYYY-MM-DD format — returns all events for the day).",
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
    findAll(
        @Query("category") category?: string,
        @Query("date") date?: string,
        @Query("page") page = "1",
        @Query("limit") limit = "20",
    ) {
        const filter: Record<string, unknown> = {};
        if (category) filter.category = category;
        if (date) {
            const from = new Date(date);
            const to = new Date(date);
            to.setDate(to.getDate() + 1);
            filter.date = { $gte: from, $lt: to };
        }

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        return this.eventModel.find(filter).skip(skip).limit(limitNum).exec();
    }

    @Get(":id")
    @ApiOperation({ summary: "Event details" })
    @ApiParam({
        name: "id",
        description: "MongoDB ID of the event",
        example: "664f1a2b3c4d5e6f7a8b9c0e",
    })
    @ApiResponse({ status: 200, type: EventDto })
    @ApiResponse({ status: 404, description: "Event not found" })
    async findOne(@Param("id") id: string) {
        const event = await this.eventModel.findById(id).exec();
        if (!event) throw new NotFoundException("Event not found");
        return event;
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Create an event",
        description:
            "Creates a community event. `createdBy` is automatically populated from the JWT.",
    })
    @ApiResponse({ status: 201, type: EventDto, description: "Event created" })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    async create(@Body() dto: CreateEventDto, @Request() req: AuthRequest) {
        const created = await this.eventModel.create({
            ...dto,
            createdBy: req.user.sub,
        });
        void this.socialService.syncEvent(
            created._id.toString(),
            created.title,
            created.date,
            created.neighborhoodId?.toString(),
        );
        return created;
    }

    @Post(":id/interest")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Mark interest in an event",
        description:
            "Adds the current user to `interestedUserIds` (idempotent via `$addToSet`).",
    })
    @ApiParam({ name: "id", description: "MongoDB ID of the event" })
    @ApiResponse({ status: 201, type: EventInterestResponseDto })
    @ApiResponse({ status: 404, description: "Event not found" })
    async markInterest(@Param("id") id: string, @Request() req: AuthRequest) {
        const event = await this.eventModel
            .findByIdAndUpdate(
                id,
                { $addToSet: { interestedUserIds: req.user.sub } },
                { new: true },
            )
            .exec();

        if (!event) throw new NotFoundException("Event not found");
        return { interested: event.interestedUserIds.length };
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Update an event" })
    @ApiParam({ name: "id", description: "MongoDB ID of the event" })
    @ApiResponse({
        status: 200,
        type: EventDto,
        description: "Event updated",
    })
    @ApiResponse({ status: 404, description: "Event not found" })
    async update(@Param("id") id: string, @Body() dto: UpdateEventDto) {
        const event = await this.eventModel
            .findByIdAndUpdate(id, dto, { new: true })
            .exec();
        if (!event) throw new NotFoundException("Event not found");
        return event;
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(204)
    @ApiOperation({ summary: "Delete an event" })
    @ApiParam({ name: "id", description: "MongoDB ID of the event" })
    @ApiResponse({ status: 204, description: "Event deleted" })
    @ApiResponse({ status: 404, description: "Event not found" })
    async remove(@Param("id") id: string) {
        const result = await this.eventModel.findByIdAndDelete(id).exec();
        if (!result) throw new NotFoundException("Event not found");
    }
}
