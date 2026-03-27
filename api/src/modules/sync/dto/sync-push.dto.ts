import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsArray,
    IsDateString,
    IsEnum,
    IsObject,
    IsUUID,
    ValidateNested,
} from "class-validator";

export class SyncMutationDto {
    @ApiProperty({ enum: ["incident"] })
    @IsEnum(["incident"])
    entityType: "incident";

    @ApiProperty()
    @IsUUID()
    entityId: string;

    @ApiProperty({ enum: ["create", "update", "resolve"] })
    @IsEnum(["create", "update", "resolve"])
    operation: "create" | "update" | "resolve";

    @ApiProperty()
    @IsObject()
    data: Record<string, unknown>;

    @ApiProperty()
    @IsDateString()
    clientTimestamp: string;
}

export class SyncPushDto {
    @ApiProperty({ type: [SyncMutationDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SyncMutationDto)
    mutations: SyncMutationDto[];
}

export type SyncMutation = SyncMutationDto;
