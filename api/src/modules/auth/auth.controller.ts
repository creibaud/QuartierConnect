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
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { Public } from "src/common/decorators/public.decorator";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import type { User } from "src/database/drizzle/schema";
import { AuthService } from "src/modules/auth/auth.service";
import { LoginDto } from "src/modules/auth/dto/login.dto";
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
    @ApiResponse({ status: 200, description: "Login successful" })
    @ApiResponse({ status: 401, description: "Invalid credentials" })
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
    @ApiResponse({ status: 200, description: "Login completed successfully" })
    @ApiResponse({ status: 401, description: "Invalid TOTP code or token" })
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
    @ApiResponse({ status: 200, description: "Token refreshed successfully" })
    @ApiResponse({
        status: 401,
        description: "Invalid or missing refresh token",
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
    @ApiResponse({ status: 200, description: "Logout successful" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
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
