import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";

export class SsoExchangeDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
    @IsString()
    @IsUUID(4)
    ssoToken: string;

    @ApiPropertyOptional({
        description:
            "PKCE state — required when the token was generated with a state",
    })
    @IsOptional()
    @IsString()
    state?: string;
}
