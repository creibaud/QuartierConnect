import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class LogoutDto {
    @ApiProperty()
    @IsUUID()
    userId: string;
}
