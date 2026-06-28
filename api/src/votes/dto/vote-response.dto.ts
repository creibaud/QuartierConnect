import { ApiProperty } from "@nestjs/swagger";

export class VoteActionResponseDto {
    @ApiProperty({
        example: "added",
        enum: ["added", "removed", "changed"],
        description: "Result of the vote operation",
    })
    action: string;

    @ApiProperty({
        example: "like",
        description: "Vote type applied (like/dislike/up/down)",
    })
    voteType: string;
}

export class VoteBreakdownDto {
    @ApiProperty({
        example: 7,
        description: "Number of positive votes (like/up)",
    })
    like?: number;

    @ApiProperty({
        example: 2,
        description: "Number of negative votes (dislike/down)",
    })
    dislike?: number;

    @ApiProperty({
        example: 5,
        description: "▲ votes for incidents/comments",
    })
    up?: number;

    @ApiProperty({
        example: 1,
        description: "▼ votes for incidents/comments",
    })
    down?: number;
}

export class VoteScoreResponseDto {
    @ApiProperty({
        example: 5,
        description: "Net score (likes - dislikes or up - down)",
    })
    score: number;

    @ApiProperty({ type: VoteBreakdownDto })
    breakdown: VoteBreakdownDto;
}
