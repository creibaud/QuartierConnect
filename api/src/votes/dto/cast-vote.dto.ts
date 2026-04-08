import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { VoteTargetType, VoteType } from "../schemas/vote.schema";

export class CastVoteDto {
    @ApiProperty({ enum: VoteTargetType })
    @IsEnum(VoteTargetType)
    targetType: VoteTargetType;

    @ApiProperty({ example: "mongodb-object-id-or-uuid" })
    @IsString()
    @IsNotEmpty()
    targetId: string;

    @ApiProperty({ enum: VoteType })
    @IsEnum(VoteType)
    voteType: VoteType;
}
