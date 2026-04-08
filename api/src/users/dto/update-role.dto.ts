import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";

export class UpdateRoleDto {
    @ApiProperty({
        description: "Nouveau rôle de l'utilisateur",
        enum: ["resident", "moderator", "admin", "banned"],
        example: "moderator",
    })
    @IsString()
    @IsIn(["resident", "moderator", "admin", "banned"])
    role: string;
}
