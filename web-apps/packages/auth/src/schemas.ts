import { z } from "zod";

export interface ValidationMessages {
    emailInvalid: string;
    passwordRequired: string;
    passwordMinLength: string;
    passwordUppercase: string;
    passwordLowercase: string;
    passwordDigit: string;
    passwordSpecial: string;
    nameMinLength: string;
    codeRequired: string;
}

export function createLoginSchema(msg: Pick<ValidationMessages, "emailInvalid" | "passwordRequired">) {
    return z.object({
        email: z.string().email(msg.emailInvalid),
        password: z.string().min(1, msg.passwordRequired),
    });
}

export function createRegisterSchema(msg: ValidationMessages) {
    return z.object({
        firstName: z.string().min(2, msg.nameMinLength),
        lastName: z.string().min(2, msg.nameMinLength),
        email: z.string().email(msg.emailInvalid),
        password: z
            .string()
            .min(8, msg.passwordMinLength)
            .regex(/[A-Z]/, msg.passwordUppercase)
            .regex(/[a-z]/, msg.passwordLowercase)
            .regex(/\d/, msg.passwordDigit)
            .regex(/[@$!%*?&]/, msg.passwordSpecial),
    });
}

export function createTotpSchema(msg: Pick<ValidationMessages, "codeRequired">) {
    return z.object({
        code: z.string().min(1, msg.codeRequired),
    });
}

export type LoginValues = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterValues = z.infer<ReturnType<typeof createRegisterSchema>>;
export type TotpValues = z.infer<ReturnType<typeof createTotpSchema>>;
