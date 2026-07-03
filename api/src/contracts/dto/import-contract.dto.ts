import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ImportContractBodyDto {
    @ApiProperty({
        type: "string",
        format: "binary",
        description: "PDF file to import (application/pdf, max 10 MB)",
    })
    file: string;

    @ApiProperty({ example: "Convention de voisinage 2026" })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description:
            "JSON array of signatory user ids (1 to 4, must include the caller)",
        example: '["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]',
    })
    @IsString()
    @IsNotEmpty()
    signatories: string;

    @ApiProperty({
        description:
            "JSON array of signature zones. Coordinates are normalized " +
            "(0..1) relative to the page, origin at the top-left corner: " +
            "{page, x, y, w, h, signerId, kind: signature|initials}. " +
            "Every signatory needs at least one zone.",
        example:
            '[{"page":1,"x":0.1,"y":0.75,"w":0.3,"h":0.08,' +
            '"signerId":"a1b2c3d4-e5f6-7890-abcd-ef1234567890",' +
            '"kind":"signature"}]',
    })
    @IsString()
    @IsNotEmpty()
    zones: string;
}
