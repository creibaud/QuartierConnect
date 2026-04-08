import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class DslQueryResultDto {
    @ApiProperty({
        example: "find",
        enum: ["find", "count"],
        description: "Type de requête DSL compilée",
    })
    type: string;

    @ApiProperty({
        example: "incidents",
        enum: ["incidents", "services", "events", "neighborhoods"],
    })
    collection: string;

    @ApiProperty({
        example: { status: "open" },
        description: "Filtre MongoDB généré par le compilateur DSL",
    })
    filter: Record<string, unknown>;

    @ApiPropertyOptional({
        example: 10,
        description: "Limite de résultats (clause LIMIT)",
    })
    limit?: number;

    @ApiPropertyOptional({
        example: [{ id: "uuid-1", title: "Lampadaire cassé", status: "open" }],
        description:
            "Documents retournés par la requête find (absent pour count)",
    })
    results?: unknown[];

    @ApiPropertyOptional({
        example: 5,
        description: "Nombre de documents (uniquement pour les requêtes COUNT)",
    })
    count?: number;
}
