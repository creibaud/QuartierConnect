import { ApiProperty } from "@nestjs/swagger";

export class AddressSuggestionDto {
    @ApiProperty() label: string;
    @ApiProperty() lat: number;
    @ApiProperty() lng: number;
}
