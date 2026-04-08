import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Request,
    Res,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request as ExpressRequest, Response } from "express";
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

const REFRESH_COOKIE = "qc_rt";
const REFRESH_COOKIE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface AuthenticatedRequest extends ExpressRequest {
    user: {
        sub: string;
        email: string;
        role: string;
        jti?: string;
        exp?: number;
    };
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    private setRefreshCookie(res: Response, token: string): void {
        res.cookie(REFRESH_COOKIE, token, {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
            maxAge: REFRESH_COOKIE_TTL_MS,
            path: "/",
        });
    }

    private clearRefreshCookie(res: Response): void {
        res.clearCookie(REFRESH_COOKIE, { path: "/" });
    }

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
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const tokens = await this.authService.login(dto);
        this.setRefreshCookie(res, tokens.refreshToken);
        return tokens;
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
    async exchangeSsoToken(
        @Body() dto: SsoExchangeDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const tokens = await this.authService.exchangeSsoToken(
            dto.ssoToken,
            dto.state,
        );
        this.setRefreshCookie(res, tokens.refreshToken);
        return tokens;
    }

    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @ApiOperation({
        summary: "Rotation du refresh token → nouvelle paire JWT",
        description:
            "Invalide l'ancien refresh token et retourne une nouvelle paire. Le token est lu depuis le cookie httpOnly qc_rt ou depuis le body (compatibilité desktop).",
    })
    @ApiResponse({ status: 200, type: RefreshTokensResponseDto })
    @ApiResponse({
        status: 401,
        description:
            "TOKEN_REVOKED | TOKEN_INVALID — refresh token invalide ou révoqué",
    })
    async refresh(
        @Req() req: ExpressRequest,
        @Res({ passthrough: true }) res: Response,
        @Body() dto: RefreshDto,
    ) {
        const token =
            (req.cookies as Record<string, string>)?.[REFRESH_COOKIE] ??
            dto.refreshToken;
        const tokens = await this.authService.refresh(token);
        this.setRefreshCookie(res, tokens.refreshToken);
        return tokens;
    }

    @Post("logout")
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Déconnexion — révocation du refresh token côté serveur",
        description:
            "Efface le hash du refresh token en base et révoque l'access token courant (JTI blocklist). Efface également le cookie qc_rt.",
    })
    @ApiResponse({ status: 200, type: LogoutResponseDto })
    async logout(
        @Req() req: AuthenticatedRequest,
        @Res({ passthrough: true }) res: Response,
    ) {
        this.clearRefreshCookie(res);
        return this.authService.logout(
            req.user.sub,
            req.user.jti,
            req.user.exp,
        );
    }
}
