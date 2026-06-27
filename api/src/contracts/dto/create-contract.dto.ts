import { ApiProperty } from "@nestjs/swagger";
import {
    IsArray,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
} from "class-validator";

export class CreateContractDto {
    @ApiProperty({ example: "Service provision contract" })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: "The provider agrees to..." })
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiProperty({ example: ["user-uuid-1", "user-uuid-2"], required: false })
    @IsArray()
    @IsUUID("4", { each: true })
    @IsOptional()
    signatories?: string[];
}
