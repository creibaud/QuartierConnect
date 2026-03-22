import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class TotpCodeDto {
    @ApiProperty({
        example: "123456",
        description: "6-digit TOTP code or backup code (XXXX-XXXX)",
    })
    @IsString()
    code: string;
}

export class TotpValidateDto {
    @ApiProperty({
        description:
            "Short-lived token received after a successful password login when TOTP is enabled",
    })
    @IsString()
    totpToken: string;

    @ApiProperty({
        example: "123456",
        description:
            "6-digit TOTP code from the authenticator app, or a backup code",
    })
    @IsString()
    code: string;
}
