import { useId } from "react";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { Label } from "@workspace/ui/components/label";

export const TOTP_LENGTH = 6;

export function TotpCodeField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const id = useId();
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <InputOTP
                id={id}
                maxLength={TOTP_LENGTH}
                value={value}
                onChange={onChange}
                aria-label={label}
            >
                <InputOTPGroup>
                    {Array.from({ length: TOTP_LENGTH }, (_, index) => (
                        <InputOTPSlot key={index} index={index} />
                    ))}
                </InputOTPGroup>
            </InputOTP>
        </div>
    );
}
