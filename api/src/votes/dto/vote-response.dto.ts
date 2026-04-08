import { ApiProperty } from "@nestjs/swagger";

export class VoteActionResponseDto {
    @ApiProperty({
        example: "added",
        enum: ["added", "removed", "changed"],
        description: "Résultat de l'opération de vote",
    })
    action: string;

    @ApiProperty({
        example: "like",
        description: "Type de vote appliqué (like/dislike/up/down)",
    })
    voteType: string;
}

export class VoteBreakdownDto {
    @ApiProperty({
        example: 7,
        description: "Nombre de votes positifs (like/up)",
    })
    like?: number;

    @ApiProperty({
        example: 2,
        description: "Nombre de votes négatifs (dislike/down)",
    })
    dislike?: number;

    @ApiProperty({
        example: 5,
        description: "Votes ▲ pour incidents/commentaires",
    })
    up?: number;

    @ApiProperty({
        example: 1,
        description: "Votes ▼ pour incidents/commentaires",
    })
    down?: number;
}

export class VoteScoreResponseDto {
    @ApiProperty({
        example: 5,
        description: "Score net (likes - dislikes ou up - down)",
    })
    score: number;

    @ApiProperty({ type: VoteBreakdownDto })
    breakdown: VoteBreakdownDto;
}
