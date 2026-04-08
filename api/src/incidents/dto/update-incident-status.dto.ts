import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";

export class UpdateIncidentStatusDto {
    @ApiProperty({
        description:
            "Nouveau statut de l'incident. Transitions valides : open → in_progress → resolved",
        enum: ["open", "in_progress", "resolved"],
        example: "in_progress",
    })
    @IsString()
    @IsIn(["open", "in_progress", "resolved"])
    status: string;
}
