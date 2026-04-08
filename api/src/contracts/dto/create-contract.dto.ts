import { ApiProperty } from "@nestjs/swagger";
import {
    IsArray,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
} from "class-validator";

export class CreateContractDto {
    @ApiProperty({ example: "Contrat de prestation de service" })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: "Le prestataire s'engage à..." })
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiProperty({ example: ["user-uuid-1", "user-uuid-2"], required: false })
    @IsArray()
    @IsUUID("4", { each: true })
    @IsOptional()
    signatories?: string[];
}
