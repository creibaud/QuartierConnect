import {
    Body,
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Post,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { Public } from "src/common/decorators/public.decorator";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import type { User } from "src/database/drizzle/schema";
import { AuthService } from "src/modules/auth/auth.service";
import { LoginDto } from "src/modules/auth/dto/login.dto";
import { LogoutDto } from "src/modules/auth/dto/logout.dto";
import { RefreshDto } from "src/modules/auth/dto/refresh.dto";
import { RegisterDto } from "src/modules/auth/dto/register.dto";
import { TotpCodeDto, TotpValidateDto } from "src/modules/auth/dto/totp.dto";
import { TotpService } from "src/modules/auth/totp.service";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly totpService: TotpService,
    ) {}

    @Public()
    @Post("register")
    @ApiOperation({ summary: "Register a new client account" })
    @ApiResponse({ status: 201, description: "User registered successfully" })
    @ApiResponse({ status: 409, description: "Email already in use" })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Public()
    @Post("login")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Login" })
    @ApiResponse({ status: 200, description: "Login successful" })
    @ApiResponse({ status: 401, description: "Invalid credentials" })
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Public()
    @Post("totp/login")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Complete login with TOTP code" })
    @ApiResponse({ status: 200, description: "Login completed successfully" })
    @ApiResponse({ status: 401, description: "Invalid TOTP code or token" })
    async completeTotpLogin(@Body() dto: TotpValidateDto) {
        return this.authService.completeTotpLogin(dto);
    }

    @Public()
    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Refresh access token" })
    @ApiResponse({ status: 200, description: "Token refreshed successfully" })
    @ApiResponse({ status: 401, description: "Invalid refresh token" })
    async refresh(@Body() dto: RefreshDto) {
        return this.authService.refresh(dto);
    }

    @Post("logout")
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Logout" })
    @ApiResponse({ status: 200, description: "Logout successful" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async logout(@Body() dto: LogoutDto) {
        return this.authService.logout(dto);
    }

    @Post("totp/setup")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({
        summary: "Generate TOTP setup (secret + QR URL + backup codes)",
    })
    @ApiResponse({ status: 201, description: "TOTP setup generated" })
    @ApiResponse({ status: 409, description: "TOTP already configured" })
    async totpSetup(@CurrentUser() user: User) {
        return this.totpService.generateSetup(user.id);
    }

    @Post("totp/verify")
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Verify TOTP setup with first code" })
    @ApiResponse({ status: 200, description: "TOTP enabled successfully" })
    @ApiResponse({ status: 401, description: "Invalid TOTP code" })
    async totpVerify(@CurrentUser() user: User, @Body() dto: TotpCodeDto) {
        return this.totpService.verifySetup(user.id, dto.code);
    }

    @Delete("totp")
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Disable TOTP (requires valid TOTP code)" })
    @ApiResponse({ status: 200, description: "TOTP disabled successfully" })
    @ApiResponse({ status: 401, description: "Invalid TOTP code" })
    async totpDisable(@CurrentUser() user: User, @Body() dto: TotpCodeDto) {
        return this.totpService.disable(user.id, dto.code);
    }
}
