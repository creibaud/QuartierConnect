import {
    Controller,
    Get,
    Inject,
    Query,
    Request,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { AddressSuggestionDto } from "./dto/geocoding-response.dto";
import { GeocodingService } from "./geocoding.service";

interface AuthRequest {
    user: { sub: string };
}

// Half-size of the soft bias box, in degrees (~55 km) around the caller's home.
const VIEWBOX_HALF_DEG = 0.5;

@ApiTags("Geocoding")
@ApiBearerAuth()
@Controller("geocoding")
@UseGuards(JwtAuthGuard)
export class GeocodingController {
    constructor(
        private readonly geocoding: GeocodingService,
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
    ) {}

    @Get("search")
    @ApiOperation({
        summary: "Address autocomplete suggestions (Nominatim proxy)",
        description:
            "Softly biased toward the caller's home and preferred language; never restricted, so addresses elsewhere are still findable.",
    })
    @ApiQuery({
        name: "q",
        required: false,
        description: "Address query (min 3 chars)",
    })
    @ApiQuery({
        name: "lang",
        required: false,
        description: "Preferred label language (i18n locale)",
    })
    @ApiResponse({ status: 200, type: [AddressSuggestionDto] })
    async search(
        @Request() req: AuthRequest,
        @Query("q") q?: string,
        @Query("lang") lang?: string,
    ): Promise<AddressSuggestionDto[]> {
        const query = (q ?? "").trim();
        if (query.length < 3) return [];

        // Soft geographic bias from the caller's stored home coordinates.
        const [me] = await this.db
            .select({
                lat: schema.users.addressLat,
                lng: schema.users.addressLng,
            })
            .from(schema.users)
            .where(eq(schema.users.id, req.user.sub));
        const viewbox =
            me?.lat != null && me?.lng != null
                ? `${me.lng - VIEWBOX_HALF_DEG},${me.lat - VIEWBOX_HALF_DEG},${me.lng + VIEWBOX_HALF_DEG},${me.lat + VIEWBOX_HALF_DEG}`
                : undefined;

        return this.geocoding.search(query, { lang, viewbox });
    }
}
