import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    MinLength,
    ValidateNested,
} from "class-validator";
import type { VoteType } from "src/database/mongodb/models/vote.model";

const VOTE_TYPES = [
    "binary",
    "single_choice",
    "multi_choice",
    "weighted",
] as const;

class VoteOptionInputDto {
    @ApiProperty({ description: "Label of the vote option", example: "Yes" })
    @IsString()
    label: string;
}

export class CreateVoteDto {
    @ApiProperty({ description: "Quartier UUID" })
    @IsUUID()
    quartierId: string;

    @ApiProperty({ minLength: 2, maxLength: 255 })
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    title: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ enum: VOTE_TYPES })
    @IsEnum(VOTE_TYPES)
    type: VoteType;

    @ApiProperty({
        type: [VoteOptionInputDto],
        description: "Ignored for binary type (yes/no created automatically)",
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => VoteOptionInputDto)
    options: VoteOptionInputDto[];

    @ApiProperty({ minimum: 5, maximum: 44640 })
    @IsInt()
    @Min(5)
    @Max(44640)
    durationMinutes: number;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    isAnonymous?: boolean = false;

    @ApiPropertyOptional({ minimum: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    quorumRequired?: number;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    showResults?: boolean = true;

    @ApiPropertyOptional({
        description: "Restrict vote to a specific group UUID",
    })
    @IsOptional()
    @IsUUID()
    restrictedToGroup?: string;
}
