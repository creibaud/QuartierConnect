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
import {
    AuthTokensResponseDto,
    LogoutResponseDto,
    RefreshTokensResponseDto,
} from "./dto/auth-responses.dto";
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
        description:
            "Authentifie l'utilisateur et retourne une paire de tokens JWT. Le code TOTP est obligatoire (6 chiffres, valide 30s). Limité à 5 tentatives par 15 min.",
    })
    @ApiResponse({ status: 200, type: AuthTokensResponseDto })
    @ApiResponse({
        status: 401,
        description:
            "INVALID_PASSWORD | INVALID_TOTP — identifiants incorrects",
    })
    @ApiResponse({
        status: 429,
        description: "TOO_MANY_REQUESTS — attendre 15 minutes",
    })
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
            "Endpoint public. Le token est invalidé après le premier échange. Retourne une paire JWT correspondant à l'utilisateur d'origine. Le paramètre `state` optionnel doit correspondre au state fourni lors de la génération (protection CSRF PKCE).",
    })
    @ApiResponse({ status: 200, type: AuthTokensResponseDto })
    @ApiResponse({
        status: 401,
        description: "SSO_INVALID — token invalide, expiré ou déjà utilisé",
    })
    exchangeSsoToken(@Body() dto: SsoExchangeDto) {
        return this.authService.exchangeSsoToken(dto.ssoToken, dto.state);
    }

    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Rotation du refresh token → nouvelle paire JWT",
        description:
            "Invalide l'ancien refresh token et retourne une nouvelle paire. Utiliser silencieusement côté client quand l'accessToken expire (401).",
    })
    @ApiResponse({ status: 200, type: RefreshTokensResponseDto })
    @ApiResponse({
        status: 401,
        description:
            "TOKEN_REVOKED | TOKEN_INVALID — refresh token invalide ou révoqué",
    })
    refresh(@Body() dto: RefreshDto) {
        return this.authService.refresh(dto.refreshToken);
    }

    @Post("logout")
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Déconnexion — révocation du refresh token côté serveur",
        description:
            "Efface le hash du refresh token en base. L'accessToken reste valide jusqu'à expiration (15 min).",
    })
    @ApiResponse({ status: 200, type: LogoutResponseDto })
    logout(@Request() req: AuthenticatedRequest) {
        return this.authService.logout(req.user.sub);
    }
}
