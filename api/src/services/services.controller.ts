import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
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
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { SocialService } from "../social/social.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { Service, ServiceDocument } from "./schemas/service.schema";

interface AuthRequest {
    user: { sub: string; role: string };
}

@ApiTags("Services")
@Controller("services")
export class ServicesController {
    constructor(
        @InjectModel(Service.name)
        private readonly serviceModel: Model<ServiceDocument>,
        private readonly socialService: SocialService,
    ) {}

    @Get()
    @ApiOperation({
        summary: "Lister les services",
        description:
            "Retourne les annonces de services, filtrables par catégorie et type.",
    })
    @ApiQuery({
        name: "category",
        required: false,
        example: "gardening",
        description: "Catégorie du service",
    })
    @ApiQuery({
        name: "type",
        required: false,
        enum: ["free", "paid", "exchange"],
        description: "Type de service",
    })
    @ApiQuery({ name: "page", required: false, example: "1" })
    @ApiQuery({ name: "limit", required: false, example: "20" })
    @ApiResponse({
        status: 200,
        description: "Tableau des services",
        schema: {
            example: [
                {
                    _id: "664f1a2b3c4d5e6f7a8b9c0d",
                    title: "Aide au jardinage",
                    description: "Disponible les week-ends pour jardinage.",
                    category: "gardening",
                    type: "free",
                    createdBy: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    neighborhoodId: null,
                },
            ],
        },
    })
    findAll(
        @Query("category") category?: string,
        @Query("type") type?: string,
        @Query("page") page = "1",
        @Query("limit") limit = "20",
    ) {
        const filter: Record<string, string> = {};
        if (category) filter.category = category;
        if (type) filter.type = type;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        return this.serviceModel.find(filter).skip(skip).limit(limitNum).exec();
    }

    @Get(":id")
    @ApiOperation({ summary: "Détail d'un service" })
    @ApiParam({
        name: "id",
        description: "ID MongoDB du service",
        example: "664f1a2b3c4d5e6f7a8b9c0d",
    })
    @ApiResponse({ status: 200, description: "Service trouvé" })
    @ApiResponse({ status: 404, description: "Service introuvable" })
    async findOne(@Param("id") id: string) {
        const service = await this.serviceModel.findById(id).exec();
        if (!service) throw new NotFoundException("Service not found");
        return service;
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Créer une annonce de service",
        description:
            "Crée une annonce de service. Le champ `createdBy` est automatiquement renseigné depuis le JWT.",
    })
    @ApiResponse({ status: 201, description: "Service créé" })
    @ApiResponse({ status: 401, description: "Non authentifié" })
    async create(@Body() dto: CreateServiceDto, @Request() req: AuthRequest) {
        const created = await this.serviceModel.create({
            ...dto,
            createdBy: req.user.sub,
        });
        void this.socialService.syncService(
            created._id.toString(),
            created.title,
            created.neighborhoodId?.toString(),
        );
        return created;
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Modifier un service",
        description: "Le propriétaire ou un admin peut modifier.",
    })
    @ApiParam({ name: "id", description: "ID MongoDB du service" })
    @ApiResponse({ status: 200, description: "Service mis à jour" })
    @ApiResponse({ status: 403, description: "Accès refusé" })
    @ApiResponse({ status: 404, description: "Service introuvable" })
    async update(
        @Param("id") id: string,
        @Body() dto: UpdateServiceDto,
        @Request() req: AuthRequest,
    ) {
        const service = await this.serviceModel.findById(id).exec();
        if (!service) throw new NotFoundException("Service not found");

        if (service.createdBy !== req.user.sub && req.user.role !== "admin") {
            throw new ForbiddenException(
                "You can only update your own services",
            );
        }

        const updated = await this.serviceModel
            .findByIdAndUpdate(id, dto, { new: true })
            .exec();
        if (updated) {
            void this.socialService.syncService(
                updated._id.toString(),
                updated.title,
                updated.neighborhoodId?.toString(),
            );
        }
        return updated;
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("admin")
    @ApiBearerAuth()
    @ApiOperation({ summary: "Supprimer un service (admin uniquement)" })
    @ApiParam({ name: "id", description: "ID MongoDB du service" })
    @ApiResponse({ status: 200, description: "{ success: true }" })
    @ApiResponse({ status: 403, description: "Rôle insuffisant" })
    @ApiResponse({ status: 404, description: "Service introuvable" })
    async remove(@Param("id") id: string) {
        const deleted = await this.serviceModel.findByIdAndDelete(id).exec();
        if (!deleted) throw new NotFoundException("Service not found");
        void this.socialService.deleteNode("Service", deleted._id.toString());
        return { success: true };
    }
}
