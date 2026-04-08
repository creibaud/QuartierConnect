import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class RefreshDto {
    @ApiPropertyOptional({
        description:
            "Refresh token (desktop only). Web clients use the qc_rt httpOnly cookie instead.",
    })
    @IsOptional()
    @IsString()
    refreshToken?: string;
}
