import { useMemo, useState } from "react";
import { useIntlayer } from "react-intlayer";
import { useForm } from "@tanstack/react-form";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { FieldGroup } from "@workspace/ui/components/field";
import { asText } from "@workspace/ui/lib/as-text";
import { createTotpSchema, type TotpValues } from "../schemas";
import { OtpField } from "./otp-field";

interface TotpFormProps {
    onSubmit: (values: TotpValues) => Promise<void>;
    onBack: () => void;
}

export function TotpForm({ onSubmit, onBack }: TotpFormProps) {
    const [serverError, setServerError] = useState<string | null>(null);
    const t = useIntlayer("auth");

    const schema = useMemo(
        () =>
            createTotpSchema({
                codeRequired: asText(t.validation.codeRequired),
            }),
        [t.validation.codeRequired],
    );

    const form = useForm({
        defaultValues: { code: "" },
        validators: { onChange: schema },
        onSubmit: async ({ value }) => {
            try {
                setServerError(null);
                await onSubmit(value);
            } catch (error) {
                setServerError(
                    error instanceof Error
                        ? error.message
                        : asText(t.totp.serverError),
                );
            }
        },
    });

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>{asText(t.totp.title)}</CardTitle>
                <CardDescription>{asText(t.totp.description)}</CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.handleSubmit();
                    }}
                    noValidate
                >
                    <FieldGroup className="gap-4">
                        <form.Field name="code">
                            {(field) => (
                                <OtpField
                                    id={field.name}
                                    label={asText(t.totp.codeLabel)}
                                    value={field.state.value}
                                    onChange={field.handleChange}
                                    onBlur={field.handleBlur}
                                    errors={
                                        field.state.meta.errors as Array<{
                                            message?: string;
                                        }>
                                    }
                                    isTouched={field.state.meta.isTouched}
                                    isValid={field.state.meta.isValid}
                                />
                            )}
                        </form.Field>

                        {serverError && (
                            <p className="text-destructive text-center text-sm">
                                {serverError}
                            </p>
                        )}

                        <form.Subscribe
                            selector={(state) => [
                                state.canSubmit,
                                state.isSubmitting,
                            ]}
                        >
                            {([canSubmit, isSubmitting]) => (
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={
                                        !canSubmit || Boolean(isSubmitting)
                                    }
                                >
                                    {isSubmitting
                                        ? asText(t.totp.submitting)
                                        : asText(t.totp.submit)}
                                </Button>
                            )}
                        </form.Subscribe>
                    </FieldGroup>
                </form>
            </CardContent>
            <CardFooter className="justify-center">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-muted-foreground text-sm underline-offset-4 hover:underline"
                >
                    {asText(t.totp.backToLogin)}
                </button>
            </CardFooter>
        </Card>
    );
}
