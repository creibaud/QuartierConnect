import { Input } from "@workspace/ui/components/input";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { Label } from "@workspace/ui/components/label";
import { useFieldContext } from "@workspace/ui/lib/form-context";

function extractErrorMessage(error: unknown): string {
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message: unknown }).message);
    }
    return String(error);
}

function FieldError({ errors }: { errors: unknown[] }) {
    const first = errors[0];
    if (!first) return null;
    return (
        <p role="alert" className="text-destructive text-sm">
            {extractErrorMessage(first)}
        </p>
    );
}

export function TextField({
    label,
    type = "text",
    placeholder,
    autoFocus,
}: {
    label: string;
    type?: string;
    placeholder?: string;
    autoFocus?: boolean;
}) {
    const field = useFieldContext<string>();
    return (
        <div className="space-y-2">
            <Label htmlFor={field.name}>{label}</Label>
            <Input
                id={field.name}
                type={type}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={placeholder}
                autoFocus={autoFocus}
                aria-invalid={field.state.meta.errors.length > 0}
            />
            <FieldError errors={field.state.meta.errors} />
        </div>
    );
}

export function OtpField({ label }: { label: string }) {
    const field = useFieldContext<string>();
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <InputOTP
                maxLength={6}
                value={field.state.value}
                onChange={(v) => field.handleChange(v)}
                onBlur={field.handleBlur}
                aria-label={label}
            >
                <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                </InputOTPGroup>
            </InputOTP>
            <FieldError errors={field.state.meta.errors} />
        </div>
    );
}
