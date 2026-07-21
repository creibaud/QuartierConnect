import { ApiProperty } from "@nestjs/swagger";
import {
    ArrayMaxSize,
    ArrayMinSize,
    Equals,
    IsArray,
    IsNumber,
    registerDecorator,
    ValidationOptions,
} from "class-validator";

// GeoJSON [lng, lat] within WGS84 bounds; rejects out-of-range coordinates with
// 400 instead of letting the 2dsphere index throw a 500 on insert.
function IsGeoCoordinates(options?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            name: "isGeoCoordinates",
            target: object.constructor,
            propertyName,
            options,
            validator: {
                validate(value: unknown) {
                    if (!Array.isArray(value) || value.length !== 2) {
                        return false;
                    }
                    const [lng, lat] = value as [number, number];
                    return (
                        typeof lng === "number" &&
                        typeof lat === "number" &&
                        lng >= -180 &&
                        lng <= 180 &&
                        lat >= -90 &&
                        lat <= 90
                    );
                },
                defaultMessage() {
                    return "coordinates must be [lng, lat] within [-180,180] and [-90,90]";
                },
            },
        });
    };
}

// GeoJSON Point ([lng, lat]) validated here so a malformed shape is rejected with 400.
export class GeoPointDto {
    @ApiProperty({ enum: ["Point"], example: "Point" })
    @Equals("Point")
    type: "Point";

    @ApiProperty({ type: [Number], example: [2.3522, 48.8566] })
    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(2)
    @IsNumber({}, { each: true })
    @IsGeoCoordinates()
    coordinates: [number, number];
}
