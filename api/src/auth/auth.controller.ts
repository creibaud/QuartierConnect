import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
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
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterDto, RegisterResponseDto } from "./dto/register.dto";
import { SsoExchangeDto } from "./dto/sso-exchange.dto";
import { SsoGenerateDto, SsoGenerateResponseDto } from "./dto/sso-generate.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

interface AuthenticatedRequest {
    user: { sub: string; email: string; role: string };
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post("register")
    @ApiOperation({ summary: "Create account + generate TOTP secret" })
    @ApiResponse({ status: 201, type: RegisterResponseDto })
    @ApiResponse({ status: 409, description: "EMAIL_ALREADY_EXISTS" })
    register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
        return this.authService.register(dto);
    }

    @Post("login")
    @HttpCode(HttpStatus.OK)
    @Throttle({
        default: {
            limit: parseInt(process.env.LOGIN_RATE_LIMIT ?? "5"),
            ttl: 900000,
        },
    })
    @ApiOperation({
        summary: "Login with email + password + TOTP code (6 digits)",
    })
    @ApiResponse({
        status: 200,
        description: "{ accessToken, refreshToken, user }",
    })
    @ApiResponse({
        status: 401,
        description: "INVALID_PASSWORD | INVALID_TOTP",
    })
    @ApiResponse({ status: 429, description: "Too many attempts — wait 15min" })
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Post("sso/generate")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Step 1/2: Generate one-time SSO token (TTL 5min, single use)",
        description:
            'Requires active JWT session. Returns a UUID token to pass to POST /auth/sso/exchange on another surface. Pass surface: "java-desktop" for the desktop app.',
    })
    @ApiResponse({ status: 201, type: SsoGenerateResponseDto })
    generateSsoToken(
        @Request() req: AuthenticatedRequest,
        @Body() dto: SsoGenerateDto,
    ): Promise<SsoGenerateResponseDto> {
        return this.authService.generateSsoToken(
            req.user.sub,
            dto.surface,
            dto.state,
        );
    }

    @Post("sso/exchange")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Step 2/2: Exchange SSO token for JWT pair",
        description:
            "Public endpoint. Token is invalidated after first use. Returns JWT pair for the originating user.",
    })
    @ApiResponse({
        status: 200,
        description: "{ accessToken, refreshToken, user }",
    })
    @ApiResponse({
        status: 401,
        description: "SSO_INVALID — invalid, expired or already used",
    })
    exchangeSsoToken(@Body() dto: SsoExchangeDto) {
        return this.authService.exchangeSsoToken(dto.ssoToken, dto.state);
    }

    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Rotate refresh token → new JWT pair" })
    @ApiResponse({ status: 200, description: "{ accessToken, refreshToken }" })
    @ApiResponse({ status: 401, description: "TOKEN_REVOKED | TOKEN_INVALID" })
    refresh(@Body() dto: RefreshDto) {
        return this.authService.refresh(dto.refreshToken);
    }

    @Post("logout")
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Revoke refresh token (server-side)" })
    @ApiResponse({ status: 200, description: "{ success: true }" })
    logout(@Request() req: AuthenticatedRequest) {
        return this.authService.logout(req.user.sub);
    }
}
