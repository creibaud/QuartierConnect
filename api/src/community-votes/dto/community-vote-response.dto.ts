import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CommunityVoteType } from "../schemas/community-vote.schema";

export class VoteOptionResponseDto {
    @ApiProperty({ example: "yes" })
    id: string;

    @ApiProperty({ example: "Yes" })
    label: string;
}

export class CastRecordDto {
    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    userId: string;

    @ApiProperty({
        type: [String],
        example: ["yes"],
        description: "Selected choices (option ids)",
    })
    choices: string[];

    @ApiPropertyOptional({
        example: { yes: 0.7, no: 0.3 },
        description: "Weights for WEIGHTED votes",
    })
    weights?: Record<string, number>;

    @ApiProperty({ example: "2026-06-01T09:00:00.000Z" })
    castAt: string;
}

export class CommunityVoteDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c10" })
    _id: string;

    @ApiProperty({ example: "Should we install benches in the park?" })
    title: string;

    @ApiPropertyOptional({
        example: "Community vote on the park layout.",
    })
    description?: string;

    @ApiProperty({ enum: CommunityVoteType, example: CommunityVoteType.BINARY })
    voteType: CommunityVoteType;

    @ApiProperty({ type: [VoteOptionResponseDto] })
    options: VoteOptionResponseDto[];

    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    createdBy: string;

    @ApiProperty({ example: "2026-07-01T00:00:00.000Z" })
    endsAt: string;

    @ApiProperty({ example: false })
    isAnonymous: boolean;

    @ApiProperty({
        example: 0,
        description: "Quorum as % of required participants",
    })
    quorum: number;

    @ApiProperty({
        type: [CastRecordDto],
        description: "Recorded votes (empty if isAnonymous=false)",
    })
    casts: CastRecordDto[];

    @ApiProperty({
        example: "open",
        enum: ["open", "closed"],
    })
    status: string;

    @ApiProperty({ example: "2026-04-05T10:00:00.000Z" })
    createdAt: string;
}

export class CommunityVoteOptionResultDto {
    @ApiProperty({ example: "yes" })
    optionId: string;

    @ApiProperty({ example: "Yes" })
    label: string;

    @ApiProperty({ example: 12 })
    count: number;

    @ApiProperty({ example: 75.0, description: "Percentage of total votes" })
    percentage: number;
}

export class CommunityVoteResultsDto {
    @ApiProperty({ example: 16 })
    totalVotes: number;

    @ApiProperty({ type: [CommunityVoteOptionResultDto] })
    results: CommunityVoteOptionResultDto[];

    @ApiProperty({
        example: "open",
        enum: ["open", "closed"],
    })
    status: string;

    @ApiProperty({
        example: false,
        description: "Quorum reached (totalVotes >= quorum% of members)",
    })
    quorumReached: boolean;
}
