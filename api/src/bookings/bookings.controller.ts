import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Request,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto } from "./dto/create-booking.dto";

interface AuthRequest {
    user: { sub: string; role: string };
}

@ApiTags("Bookings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("bookings")
export class BookingsController {
    constructor(private readonly bookings: BookingsService) {}

    @Post()
    @ApiOperation({ summary: "Request a booking on a paid service" })
    request(@Body() dto: CreateBookingDto, @Request() req: AuthRequest) {
        return this.bookings.request(dto.serviceId, req.user.sub);
    }

    @Get()
    @ApiOperation({ summary: "My bookings (as initiator or service owner)" })
    findForUser(@Request() req: AuthRequest) {
        return this.bookings.findForUser(req.user.sub);
    }

    @Get(":id")
    @ApiOperation({ summary: "Booking details (party only)" })
    findOne(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.bookings.findOne(id, req.user.sub);
    }

    @Post(":id/accept")
    @ApiOperation({ summary: "Owner accepts — generates the contract" })
    accept(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.bookings.accept(id, req.user.sub);
    }

    @Post(":id/decline")
    @ApiOperation({ summary: "Owner declines a pending booking" })
    decline(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.bookings.decline(id, req.user.sub);
    }

    @Post(":id/cancel")
    @ApiOperation({ summary: "Cancel a booking" })
    cancel(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.bookings.cancel(id, req.user.sub);
    }
}
