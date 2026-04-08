import {
    Body,
    Controller,
    Get,
    Inject,
    NotFoundException,
    Param,
    Patch,
    Query,
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
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { UpdateRoleDto } from "./dto/update-role.dto";

@ApiTags("Users (admin)")
@ApiBearerAuth()
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class UsersController {
    constructor(
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
    ) {}

    @Get()
    @ApiOperation({
        summary: "Lister les utilisateurs (admin)",
        description:
            "Retourne la liste paginée des utilisateurs. Champs retournés : id, email, role, createdAt. Les champs sensibles (passwordHash, totpSecret, refreshTokenHash) sont exclus.",
    })
    @ApiQuery({ name: "page", required: false, example: "1" })
    @ApiQuery({ name: "limit", required: false, example: "20" })
    @ApiResponse({
        status: 200,
        description: "Liste des utilisateurs",
        schema: {
            example: [
                {
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    email: "alice@demo.fr",
                    role: "resident",
                    createdAt: "2026-03-15T10:00:00.000Z",
                },
                {
                    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                    email: "admin@demo.fr",
                    role: "admin",
                    createdAt: "2026-03-15T10:00:00.000Z",
                },
            ],
        },
    })
    @ApiResponse({ status: 403, description: "Rôle insuffisant" })
    findAll(@Query("page") page = "1", @Query("limit") limit = "20") {
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        return this.db
            .select({
                id: schema.users.id,
                email: schema.users.email,
                role: schema.users.role,
                createdAt: schema.users.createdAt,
            })
            .from(schema.users)
            .offset(skip)
            .limit(limitNum);
    }

    @Patch(":id/role")
    @ApiOperation({
        summary: "Changer le rôle d'un utilisateur (admin)",
        description:
            "Permet de promouvoir, rétrograder ou bannir un utilisateur. Rôles disponibles : resident, moderator, admin, banned.",
    })
    @ApiParam({
        name: "id",
        description: "UUID de l'utilisateur",
        example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    })
    @ApiResponse({
        status: 200,
        description: "Utilisateur mis à jour",
        schema: {
            example: {
                id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                email: "alice@demo.fr",
                role: "moderator",
            },
        },
    })
    @ApiResponse({ status: 403, description: "Rôle insuffisant" })
    @ApiResponse({ status: 404, description: "Utilisateur introuvable" })
    async updateRole(@Param("id") id: string, @Body() dto: UpdateRoleDto) {
        const [updated] = await this.db
            .update(schema.users)
            .set({ role: dto.role, updatedAt: new Date() })
            .where(eq(schema.users.id, id))
            .returning({
                id: schema.users.id,
                email: schema.users.email,
                role: schema.users.role,
            });

        if (!updated) throw new NotFoundException("User not found");
        return updated;
    }
}
