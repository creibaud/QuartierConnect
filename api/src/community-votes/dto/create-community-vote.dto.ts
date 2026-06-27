import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsEnum,
    IsISO8601,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
    ValidateNested,
} from "class-validator";
import { CommunityVoteType } from "../schemas/community-vote.schema";

export class VoteOptionDto {
    @ApiProperty({
        example: "yes",
        description: "Unique identifier of the option",
    })
    @IsString()
    @IsNotEmpty()
    id: string;

    @ApiProperty({
        example: "Yes",
        description: "Displayed label of the option",
    })
    @IsString()
    @IsNotEmpty()
    label: string;
}

export class CreateCommunityVoteDto {
    @ApiProperty({ example: "Should we install benches in the park?" })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ enum: CommunityVoteType, example: CommunityVoteType.BINARY })
    @IsEnum(CommunityVoteType)
    voteType: CommunityVoteType;

    @ApiProperty({
        type: [VoteOptionDto],
        description:
            'Vote options. For BINARY: [{id:"yes",label:"Yes"},{id:"no",label:"No"}]',
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => VoteOptionDto)
    @ArrayMinSize(2)
    options: VoteOptionDto[];

    @ApiProperty({ example: "2026-07-01T00:00:00.000Z" })
    @IsISO8601()
    endsAt: string;

    @ApiProperty({ required: false, default: false })
    @IsBoolean()
    @IsOptional()
    isAnonymous?: boolean;

    @ApiProperty({
        required: false,
        default: 0,
        description: "Quorum as % of required participants",
    })
    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    quorum?: number;
}
