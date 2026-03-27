import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class InviteSignerDto {
    @ApiProperty({ description: "UUID of the user to invite as signer" })
    @IsUUID()
    signerUserId: string;
}
