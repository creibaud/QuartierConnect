import { Body, Controller, Post, Request, UseGuards } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { DslService, type DslRequester } from "./dsl.service";
import { DslQueryDto } from "./dto/dsl-query.dto";
import { DslQueryResultDto } from "./dto/dsl-response.dto";

interface AuthRequest {
    user: DslRequester;
}

@ApiTags("DSL")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
@Controller("dsl")
export class DslController {
    constructor(private readonly dslService: DslService) {}

    @Post("query")
    @ApiOperation({
        summary: "Execute a DSL query (admin)",
        description:
            "Compiles and executes a DSL query via the Python PLY engine (in-process via pythonia). The editor lives in the admin app, so the endpoint is administrators-only.",
    })
    @ApiResponse({ status: 201, type: DslQueryResultDto })
    @ApiResponse({
        status: 400,
        description: "DSL syntax error or unknown collection",
    })
    @ApiResponse({
        status: 403,
        description: "Insufficient role (admin required)",
    })
    execute(@Body() dto: DslQueryDto, @Request() req: AuthRequest) {
        return this.dslService.execute(dto.query, req.user);
    }
}
