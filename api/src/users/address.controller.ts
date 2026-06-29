import { Body, Controller, Get, Inject, Post, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Driver } from "neo4j-driver";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { GeocodingService } from "../geocoding/geocoding.service";
import { NeighborhoodsService } from "../neighborhoods/neighborhoods.service";
import { syncLivesIn } from "../social/lives-in.util";
import { NEO4J_DRIVER } from "../social/neo4j/neo4j.provider";
import { SubmitAddressDto } from "./dto/address.dto";

interface AuthRequest {
    user: { sub: string };
}

@ApiTags("Users (me)")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users/me")
export class AddressController {
    constructor(
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
        private readonly geocoding: GeocodingService,
        private readonly neighborhoods: NeighborhoodsService,
        @Inject(NEO4J_DRIVER)
        private readonly neo4jDriver: Driver,
    ) {}

    @Post("address")
    @ApiOperation({ summary: "Submit my address; assign me to a neighborhood" })
    async submit(@Request() req: AuthRequest, @Body() body: SubmitAddressDto) {
        const geo = await this.geocoding.geocode(body.address);
        if (!geo) return { status: "not_found" as const };

        const match = await this.neighborhoods.findContainingPoint(geo.lng, geo.lat);
        const neighborhoodId = match ? match._id.toString() : null;

        await this.db
            .update(schema.users)
            .set({
                address: body.address,
                addressLat: geo.lat,
                addressLng: geo.lng,
                neighborhoodId,
                updatedAt: new Date(),
            })
            .where(eq(schema.users.id, req.user.sub));

        if (neighborhoodId)
            await syncLivesIn(this.neo4jDriver, req.user.sub, neighborhoodId);

        return {
            status: neighborhoodId ? ("assigned" as const) : ("pending" as const),
            neighborhoodId,
            displayName: geo.displayName,
        };
    }

    @Get("neighborhood-status")
    @ApiOperation({ summary: "My address/neighborhood status (for the gate)" })
    async status(@Request() req: AuthRequest) {
        const [row] = await this.db
            .select({
                address: schema.users.address,
                neighborhoodId: schema.users.neighborhoodId,
            })
            .from(schema.users)
            .where(eq(schema.users.id, req.user.sub));
        return {
            hasAddress: !!row?.address,
            neighborhoodId: row?.neighborhoodId ?? null,
        };
    }

}
