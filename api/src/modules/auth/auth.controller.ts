import {
    Body,
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
    UnauthorizedException,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiExtraModels,
    ApiOkResponse,
    ApiOperation,
    ApiResponse,
    ApiTags,
    getSchemaPath,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { Public } from "src/common/decorators/public.decorator";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import type { User } from "src/database/drizzle/schema";
import { AuthService } from "src/modules/auth/auth.service";
import { LoginDto } from "src/modules/auth/dto/login.dto";
import { RegisterDto } from "src/modules/auth/dto/register.dto";
import { SsoLoginDto, SsoTokenResponseDto } from "src/modules/auth/dto/sso.dto";
import { TotpCodeDto, TotpValidateDto } from "src/modules/auth/dto/totp.dto";
import { TotpService } from "src/modules/auth/totp.service";
import {
    AuthTokenResponseDto,
    MessageResponseDto,
    TotpLoginChallengeResponseDto,
    TotpSetupResponseDto,
} from "./dto/auth-response.dto";

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
    @ApiCreatedResponse({
        description: "User registered successfully",
        type: AuthTokenResponseDto,
    })
    @ApiResponse({
        status: 409,
        description: "Email already in use",
        schema: {
            example: {
                statusCode: 409,
                message: "Email already in use",
                error: "Conflict",
            },
        },
    })
    async register(
        @Body() dto: RegisterDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.register(dto);
        this.setRefreshCookie(res, result.refreshToken);
        return { accessToken: result.accessToken, user: result.user };
    }

    @Public()
    @Post("login")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Login" })
    @ApiExtraModels(AuthTokenResponseDto, TotpLoginChallengeResponseDto)
    @ApiOkResponse({
        description: "Login successful",
        schema: {
            oneOf: [
                { $ref: getSchemaPath(AuthTokenResponseDto) },
                { $ref: getSchemaPath(TotpLoginChallengeResponseDto) },
            ],
        },
    })
    @ApiResponse({
        status: 401,
        description: "Invalid credentials",
        schema: {
            example: {
                statusCode: 401,
                message: "Invalid credentials",
                error: "Unauthorized",
            },
        },
    })
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.login(dto);

        if ("requiresTotp" in result) {
            return result;
        }

        this.setRefreshCookie(res, result.refreshToken);
        return { accessToken: result.accessToken, user: result.user };
    }

    @Public()
    @Post("totp/login")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Complete login with TOTP code" })
    @ApiOkResponse({
        description: "Login completed successfully",
        type: AuthTokenResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: "Invalid TOTP code or token",
        schema: {
            example: {
                statusCode: 401,
                message: "Invalid TOTP code or token",
                error: "Unauthorized",
            },
        },
    })
    async completeTotpLogin(
        @Body() dto: TotpValidateDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.completeTotpLogin(dto);
        this.setRefreshCookie(res, result.refreshToken);
        return { accessToken: result.accessToken, user: result.user };
    }

    @Public()
    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Refresh access token using httpOnly cookie" })
    @ApiOkResponse({
        description: "Token refreshed successfully",
        type: AuthTokenResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: "Invalid or missing refresh token",
        schema: {
            example: {
                statusCode: 401,
                message: "Invalid or missing refresh token",
                error: "Unauthorized",
            },
        },
    })
    async refresh(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { name } = this.authService.getRefreshCookieConfig();
        const refreshToken = (
            req.cookies as Record<string, string> | undefined
        )?.[name];

        if (!refreshToken) {
            throw new UnauthorizedException("No refresh token provided");
        }

        const result = await this.authService.refresh({ refreshToken });
        this.setRefreshCookie(res, result.refreshToken);
        return { accessToken: result.accessToken, user: result.user };
    }

    @Post("logout")
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Logout" })
    @ApiOkResponse({
        description: "Logout successful",
        type: MessageResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: "Unauthorized",
        schema: {
            example: {
                statusCode: 401,
                message: "Unauthorized",
                error: "Unauthorized",
            },
        },
    })
    async logout(
        @CurrentUser() user: User,
        @Res({ passthrough: true }) res: Response,
    ) {
        await this.authService.logout({ userId: user.id });
        const { name, path } = this.authService.getRefreshCookieConfig();
        res.clearCookie(name, { path });
        return { message: "Logged out successfully" };
    }

    @Post("totp/setup")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({
        summary: "Generate TOTP setup (secret + QR URL + backup codes)",
    })
    @ApiCreatedResponse({
        description: "TOTP setup generated",
        type: TotpSetupResponseDto,
    })
    @ApiResponse({
        status: 409,
        description: "TOTP already configured",
        schema: {
            example: {
                statusCode: 409,
                message: "TOTP already configured",
                error: "Conflict",
            },
        },
    })
    async totpSetup(@CurrentUser() user: User) {
        return this.totpService.generateSetup(user.id);
    }

    @Post("totp/verify")
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Verify TOTP setup with first code" })
    @ApiOkResponse({
        description: "TOTP enabled successfully",
        type: MessageResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: "Invalid TOTP code",
        schema: {
            example: {
                statusCode: 401,
                message: "Invalid TOTP code",
                error: "Unauthorized",
            },
        },
    })
    async totpVerify(@CurrentUser() user: User, @Body() dto: TotpCodeDto) {
        return this.totpService.verifySetup(user.id, dto.code);
    }

    @Public()
    @Post("sso/token")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "SSO login for the Java desktop application",
        description:
            "Authenticates an administrator and returns a long-lived access token (24 h) " +
            'with `aud: ["desktop"]` claim. ' +
            "The same JWT secret is shared with the web app, enabling seamless SSO. " +
            "TOTP code is required if the account has TOTP enabled.",
    })
    @ApiOkResponse({
        description: "Desktop SSO token issued",
        type: SsoTokenResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: "Invalid credentials or TOTP code",
        schema: {
            example: {
                statusCode: 401,
                message: "Invalid credentials",
                error: "Unauthorized",
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: "Account does not have admin role",
        schema: {
            example: {
                statusCode: 403,
                message: "Only administrators can use the desktop SSO",
                error: "Forbidden",
            },
        },
    })
    async ssoLogin(@Body() dto: SsoLoginDto) {
        return this.authService.ssoLogin(dto);
    }

    @Delete("totp")
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Disable TOTP (requires valid TOTP code)" })
    @ApiOkResponse({
        description: "TOTP disabled successfully",
        type: MessageResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: "Invalid TOTP code",
        schema: {
            example: {
                statusCode: 401,
                message: "Invalid TOTP code",
                error: "Unauthorized",
            },
        },
    })
    async totpDisable(@CurrentUser() user: User, @Body() dto: TotpCodeDto) {
        return this.totpService.disable(user.id, dto.code);
    }

    private setRefreshCookie(res: Response, token: string) {
        const { name, path, maxAge } =
            this.authService.getRefreshCookieConfig();
        const isProduction = process.env.NODE_ENV === "production";
        const sameSite = isProduction ? "strict" : "none";
        res.cookie(name, token, {
            httpOnly: true,
            secure: true,
            sameSite,
            path,
            maxAge,
        });
    }
}
