import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AddressSuggestionDto } from "./dto/geocoding-response.dto";
import { GeocodingService } from "./geocoding.service";

@ApiTags("Geocoding")
@ApiBearerAuth()
@Controller("geocoding")
@UseGuards(JwtAuthGuard)
export class GeocodingController {
    constructor(private readonly geocoding: GeocodingService) {}

    @Get("search")
    @ApiOperation({
        summary: "Address autocomplete suggestions (Nominatim proxy)",
    })
    @ApiQuery({
        name: "q",
        required: false,
        description: "Address query (min 3 chars)",
    })
    @ApiResponse({ status: 200, type: [AddressSuggestionDto] })
    async search(@Query("q") q?: string): Promise<AddressSuggestionDto[]> {
        const query = (q ?? "").trim();
        if (query.length < 3) return [];
        return this.geocoding.search(query);
    }
}
