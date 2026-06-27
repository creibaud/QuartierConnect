import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";

export class UpdateRoleDto {
    @ApiProperty({
        description: "New role for the user",
        enum: ["resident", "moderator", "admin", "banned"],
        example: "moderator",
    })
    @IsString()
    @IsIn(["resident", "moderator", "admin", "banned"])
    role: string;
}
