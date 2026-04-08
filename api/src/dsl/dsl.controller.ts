import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { DslService } from "./dsl.service";
import { DslQueryDto } from "./dto/dsl-query.dto";

@ApiTags("DSL")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("moderator", "admin")
@Controller("dsl")
export class DslController {
    constructor(private readonly dslService: DslService) {}

    @Post("query")
    @ApiOperation({
        summary: "Exécuter une requête DSL (moderator/admin)",
        description:
            "Compile et exécute une requête DSL via le moteur PLY Python (in-process via pythonia).",
    })
    @ApiResponse({
        status: 201,
        schema: {
            example: {
                type: "find",
                collection: "incidents",
                filter: { status: "open" },
                limit: 10,
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: "Erreur de syntaxe DSL ou collection inconnue",
    })
    @ApiResponse({ status: 403, description: "Rôle insuffisant" })
    execute(@Body() dto: DslQueryDto) {
        return this.dslService.execute(dto.query);
    }
}
