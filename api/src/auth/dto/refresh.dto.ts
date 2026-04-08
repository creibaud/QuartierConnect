import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class RefreshDto {
    @ApiProperty()
    @IsString()
    refreshToken: string;
}
