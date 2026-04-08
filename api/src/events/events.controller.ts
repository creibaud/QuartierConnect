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
        summary: "Lister les événements",
        description:
            "Retourne les événements communautaires, filtrables par catégorie et date (format YYYY-MM-DD — retourne tous les événements de la journée).",
    })
    @ApiQuery({
        name: "category",
        required: false,
        example: "culture",
        description: "Catégorie de l'événement",
    })
    @ApiQuery({
        name: "date",
        required: false,
        example: "2026-05-15",
        description: "Date ISO YYYY-MM-DD (filtre sur la journée entière)",
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
    @ApiOperation({ summary: "Détail d'un événement" })
    @ApiParam({
        name: "id",
        description: "ID MongoDB de l'événement",
        example: "664f1a2b3c4d5e6f7a8b9c0e",
    })
    @ApiResponse({ status: 200, type: EventDto })
    @ApiResponse({ status: 404, description: "Événement introuvable" })
    async findOne(@Param("id") id: string) {
        const event = await this.eventModel.findById(id).exec();
        if (!event) throw new NotFoundException("Event not found");
        return event;
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Créer un événement",
        description:
            "Crée un événement communautaire. `createdBy` est renseigné automatiquement depuis le JWT.",
    })
    @ApiResponse({ status: 201, type: EventDto, description: "Événement créé" })
    @ApiResponse({ status: 401, description: "Non authentifié" })
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
        summary: "Marquer son intérêt pour un événement",
        description:
            "Ajoute l'utilisateur courant à `interestedUserIds` (idempotent via `$addToSet`).",
    })
    @ApiParam({ name: "id", description: "ID MongoDB de l'événement" })
    @ApiResponse({ status: 201, type: EventInterestResponseDto })
    @ApiResponse({ status: 404, description: "Événement introuvable" })
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
    @ApiOperation({ summary: "Modifier un événement" })
    @ApiParam({ name: "id", description: "ID MongoDB de l'événement" })
    @ApiResponse({
        status: 200,
        type: EventDto,
        description: "Événement modifié",
    })
    @ApiResponse({ status: 404, description: "Événement introuvable" })
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
    @ApiOperation({ summary: "Supprimer un événement" })
    @ApiParam({ name: "id", description: "ID MongoDB de l'événement" })
    @ApiResponse({ status: 204, description: "Événement supprimé" })
    @ApiResponse({ status: 404, description: "Événement introuvable" })
    async remove(@Param("id") id: string) {
        const result = await this.eventModel.findByIdAndDelete(id).exec();
        if (!result) throw new NotFoundException("Event not found");
    }
}
