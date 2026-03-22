import {
    Field,
    FieldError,
    FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

interface InputFieldProps {
    id: string;
    name: string;
    label: string;
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    errors: Array<{ message?: string } | undefined>;
    isTouched: boolean;
    isValid: boolean;
    autoComplete?: string;
}

export function InputField({
    id,
    name,
    label,
    type = "text",
    placeholder,
    value,
    onChange,
    onBlur,
    errors,
    isTouched,
    isValid,
    autoComplete,
}: InputFieldProps) {
    const isInvalid = isTouched && !isValid;

    return (
        <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Input
                id={id}
                name={name}
                type={type}
                placeholder={placeholder}
                value={value}
                onBlur={onBlur}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={isInvalid}
                autoComplete={autoComplete}
            />
            {isInvalid && <FieldError errors={errors} />}
        </Field>
    );
}
