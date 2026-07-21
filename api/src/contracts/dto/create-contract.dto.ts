import { ApiProperty } from "@nestjs/swagger";
import {
    ArrayMaxSize,
    IsArray,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from "class-validator";

export class CreateContractDto {
    @ApiProperty({ example: "Service provision contract" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title: string;

    @ApiProperty({ example: "The provider agrees to..." })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50_000)
    content: string;

    @ApiProperty({ example: ["user-uuid-1", "user-uuid-2"], required: false })
    @IsArray()
    @IsUUID("4", { each: true })
    @ArrayMaxSize(4)
    @IsOptional()
    signatories?: string[];
}
