import {
    Field,
    FieldError,
    FieldLabel,
} from "@workspace/ui/components/field";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@workspace/ui/components/input-otp";

interface OtpFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    errors: Array<{ message?: string } | undefined>;
    isTouched: boolean;
    isValid: boolean;
}

export function OtpField({
    id,
    label,
    value,
    onChange,
    onBlur,
    errors,
    isTouched,
    isValid,
}: OtpFieldProps) {
    const isInvalid = isTouched && !isValid;

    return (
        <Field data-invalid={isInvalid} className="items-center">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <InputOTP
                id={id}
                maxLength={6}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
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
            {isInvalid && <FieldError errors={errors} />}
        </Field>
    );
}
