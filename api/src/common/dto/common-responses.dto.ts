import { ApiProperty } from "@nestjs/swagger";

export class SuccessResponseDto {
    @ApiProperty({ example: true })
    success: boolean;
}

export class ErrorResponseDto {
    @ApiProperty({ example: 400 })
    statusCode: number;

    @ApiProperty({ example: "Bad Request" })
    error: string;

    @ApiProperty({
        example: "Validation failed",
        description: "Human-readable error message or array of messages",
    })
    message: string | string[];
}
