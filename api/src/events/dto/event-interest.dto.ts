import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional } from "class-validator";
import { ParticipationSource } from "../../social/social.service";

export const PARTICIPATION_SOURCES: readonly ParticipationSource[] = [
    "swipe",
    "participate",
] as const;

export class EventInterestDto {
    @ApiPropertyOptional({
        example: true,
        default: true,
        description:
            "true adds the user to interestedUserIds (idempotent), false removes them",
    })
    @IsOptional()
    @IsBoolean()
    interested?: boolean;

    @ApiPropertyOptional({
        enum: PARTICIPATION_SOURCES,
        default: "swipe",
        description:
            "Origin of the action: 'swipe' writes INTERESTED_IN in Neo4j, 'participate' writes ATTENDING",
    })
    @IsOptional()
    @IsIn(PARTICIPATION_SOURCES)
    source?: ParticipationSource;
}
