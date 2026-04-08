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
    @IsString()
    @IsNotEmpty()
    id: string;

    @IsString()
    @IsNotEmpty()
    label: string;
}

export class CreateCommunityVoteDto {
    @ApiProperty({ example: "Faut-il installer des bancs dans le parc ?" })
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
            'Options de vote. Pour BINARY: [{id:"yes",label:"Oui"},{id:"no",label:"Non"}]',
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
        description: "Quorum en % de participants requis",
    })
    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    quorum?: number;
}
