import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class SwipeEventDto {
    @ApiProperty({ description: "MongoDB ObjectId of the event" })
    @IsString()
    @IsNotEmpty()
    eventId: string;

    @ApiProperty({
        description:
            "Whether the user liked (true) or disliked (false) the event",
    })
    @IsBoolean()
    liked: boolean;
}
