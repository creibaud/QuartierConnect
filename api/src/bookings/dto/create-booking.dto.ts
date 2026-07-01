import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateBookingDto {
    @ApiProperty({
        description: "MongoDB ID of the paid service to book",
        example: "664f1a2b3c4d5e6f7a8b9c0d",
    })
    @IsString()
    @IsNotEmpty()
    serviceId: string;
}
