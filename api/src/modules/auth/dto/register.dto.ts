import { ApiProperty } from "@nestjs/swagger";
import {
    IsEmail,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from "class-validator";

export class RegisterDto {
    @ApiProperty({ example: "john.doe@example.com" })
    @IsEmail({}, { message: "Invalid email address" })
    email: string;

    @ApiProperty({ example: "P@ssw0rd!" })
    @IsString()
    @MinLength(8, { message: "Password must be at least 8 characters long" })
    @MaxLength(50)
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        {
            message:
                "Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character",
        },
    )
    password: string;

    @ApiProperty({ example: "John" })
    @IsString()
    @MinLength(2, { message: "First name must be at least 2 characters long" })
    @MaxLength(100)
    firstName: string;

    @ApiProperty({ example: "Doe" })
    @IsString()
    @MinLength(2, { message: "Last name must be at least 2 characters long" })
    @MaxLength(100)
    lastName: string;
}
