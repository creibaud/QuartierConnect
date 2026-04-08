import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CommunityVoteType } from "../schemas/community-vote.schema";

export class VoteOptionResponseDto {
    @ApiProperty({ example: "yes" })
    id: string;

    @ApiProperty({ example: "Oui" })
    label: string;
}

export class CastRecordDto {
    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    userId: string;

    @ApiProperty({
        type: [String],
        example: ["yes"],
        description: "Choix sélectionnés (ids des options)",
    })
    choices: string[];

    @ApiPropertyOptional({
        example: { yes: 0.7, no: 0.3 },
        description: "Pondérations pour les votes WEIGHTED",
    })
    weights?: Record<string, number>;

    @ApiProperty({ example: "2026-06-01T09:00:00.000Z" })
    castAt: string;
}

export class CommunityVoteDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c10" })
    _id: string;

    @ApiProperty({ example: "Faut-il installer des bancs dans le parc ?" })
    title: string;

    @ApiPropertyOptional({
        example: "Vote communautaire sur l'aménagement du parc.",
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
        description: "Quorum en % de participants requis",
    })
    quorum: number;

    @ApiProperty({
        type: [CastRecordDto],
        description: "Votes enregistrés (vide si isAnonymous=false)",
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

    @ApiProperty({ example: "Oui" })
    label: string;

    @ApiProperty({ example: 12 })
    count: number;

    @ApiProperty({ example: 75.0, description: "Pourcentage des votes totaux" })
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
        description: "Quorum atteint (totalVotes >= quorum% des membres)",
    })
    quorumReached: boolean;
}
