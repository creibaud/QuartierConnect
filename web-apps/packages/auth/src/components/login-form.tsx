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
import { createLoginSchema, type LoginValues } from "../schemas";
import { InputField } from "./input-field";

interface LoginFormProps {
    onSubmit: (values: LoginValues) => Promise<void>;
    onRegisterClick?: () => void;
}

export function LoginForm({ onSubmit, onRegisterClick }: LoginFormProps) {
    const [serverError, setServerError] = useState<string | null>(null);
    const t = useIntlayer("auth");

    const schema = useMemo(
        () =>
            createLoginSchema({
                emailInvalid: asText(t.validation.emailInvalid),
                passwordRequired: asText(t.validation.passwordRequired),
            }),
        [t.validation.emailInvalid, t.validation.passwordRequired],
    );

    const form = useForm({
        defaultValues: { email: "", password: "" },
        validators: { onChange: schema },
        onSubmit: async ({ value }) => {
            try {
                setServerError(null);
                await onSubmit(value);
            } catch (error) {
                setServerError(
                    error instanceof Error
                        ? error.message
                        : asText(t.login.serverError),
                );
            }
        },
    });

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>{asText(t.login.title)}</CardTitle>
                <CardDescription>{asText(t.login.description)}</CardDescription>
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
                        <form.Field name="email">
                            {(field) => (
                                <InputField
                                    id={field.name}
                                    name={field.name}
                                    label={asText(t.login.emailLabel)}
                                    type="email"
                                    placeholder={asText(
                                        t.login.emailPlaceholder,
                                    )}
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
                                    autoComplete="email"
                                />
                            )}
                        </form.Field>

                        <form.Field name="password">
                            {(field) => (
                                <InputField
                                    id={field.name}
                                    name={field.name}
                                    label={asText(t.login.passwordLabel)}
                                    type="password"
                                    placeholder={asText(
                                        t.login.passwordPlaceholder,
                                    )}
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
                                    autoComplete="current-password"
                                />
                            )}
                        </form.Field>

                        {serverError && (
                            <p className="text-destructive text-sm">
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
                                        ? asText(t.login.submitting)
                                        : asText(t.login.submit)}
                                </Button>
                            )}
                        </form.Subscribe>
                    </FieldGroup>
                </form>
            </CardContent>
            {onRegisterClick && (
                <CardFooter className="justify-center">
                    <p className="text-muted-foreground text-sm">
                        {asText(t.login.noAccount)}{" "}
                        <button
                            type="button"
                            onClick={onRegisterClick}
                            className="text-primary underline-offset-4 hover:underline"
                        >
                            {asText(t.login.register)}
                        </button>
                    </p>
                </CardFooter>
            )}
        </Card>
    );
}
