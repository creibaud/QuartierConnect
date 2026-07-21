import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Request,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto } from "./dto/create-booking.dto";

interface AuthRequest {
    user: { sub: string; role: string; neighborhoodId?: string | null };
}

@ApiTags("Bookings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("bookings")
export class BookingsController {
    constructor(private readonly bookings: BookingsService) {}

    @Post()
    @ApiOperation({ summary: "Request a booking on a paid service" })
    @ApiResponse({
        status: 201,
        description: "Booking requested (status: pending)",
    })
    @ApiResponse({ status: 404, description: "Service not found" })
    @ApiResponse({
        status: 400,
        description:
            "Service is not bookable (free service or your own listing)",
    })
    request(@Body() dto: CreateBookingDto, @Request() req: AuthRequest) {
        return this.bookings.request(dto.serviceId, req.user);
    }

    @Get()
    @ApiOperation({ summary: "My bookings (as initiator or service owner)" })
    @ApiResponse({
        status: 200,
        description: "Your bookings, as initiator or as service owner",
    })
    findForUser(@Request() req: AuthRequest) {
        return this.bookings.findForUser(req.user.sub);
    }

    @Get(":id")
    @ApiOperation({ summary: "Booking details (party only)" })
    @ApiResponse({ status: 200, description: "Booking details" })
    @ApiResponse({
        status: 403,
        description: "You are not a party to this booking",
    })
    @ApiResponse({ status: 404, description: "Booking not found" })
    findOne(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.bookings.findOne(id, req.user.sub);
    }

    @Post(":id/accept")
    @ApiOperation({ summary: "Owner accepts — generates the contract" })
    @ApiResponse({
        status: 201,
        description: "Booking accepted; the contract is generated",
    })
    @ApiResponse({
        status: 403,
        description: "Only the service owner can accept",
    })
    @ApiResponse({ status: 404, description: "Booking not found" })
    @ApiResponse({ status: 409, description: "Booking is not pending" })
    accept(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.bookings.accept(id, req.user.sub);
    }

    @Post(":id/decline")
    @ApiOperation({ summary: "Owner declines a pending booking" })
    @ApiResponse({ status: 201, description: "Booking declined" })
    @ApiResponse({
        status: 403,
        description: "Only the service owner can decline",
    })
    @ApiResponse({ status: 404, description: "Booking not found" })
    @ApiResponse({ status: 409, description: "Booking is not pending" })
    decline(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.bookings.decline(id, req.user.sub);
    }

    @Post(":id/cancel")
    @ApiOperation({ summary: "Cancel a booking" })
    @ApiResponse({ status: 201, description: "Booking cancelled" })
    @ApiResponse({
        status: 403,
        description: "You are not a party to this booking",
    })
    @ApiResponse({ status: 404, description: "Booking not found" })
    cancel(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.bookings.cancel(id, req.user.sub);
    }
}
