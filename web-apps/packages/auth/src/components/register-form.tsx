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
import { createRegisterSchema, type RegisterValues } from "../schemas";
import { InputField } from "./input-field";

interface RegisterFormProps {
    onSubmit: (values: RegisterValues) => Promise<void>;
    onLoginClick?: () => void;
}

export function RegisterForm({ onSubmit, onLoginClick }: RegisterFormProps) {
    const [serverError, setServerError] = useState<string | null>(null);
    const t = useIntlayer("auth");

    const schema = useMemo(
        () =>
            createRegisterSchema({
                emailInvalid: asText(t.validation.emailInvalid),
                passwordRequired: asText(t.validation.passwordRequired),
                passwordMinLength: asText(t.validation.passwordMinLength),
                passwordUppercase: asText(t.validation.passwordUppercase),
                passwordLowercase: asText(t.validation.passwordLowercase),
                passwordDigit: asText(t.validation.passwordDigit),
                passwordSpecial: asText(t.validation.passwordSpecial),
                nameMinLength: asText(t.validation.nameMinLength),
                codeRequired: asText(t.validation.codeRequired),
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [t.validation],
    );

    const form = useForm({
        defaultValues: { email: "", password: "", firstName: "", lastName: "" },
        validators: { onChange: schema },
        onSubmit: async ({ value }) => {
            try {
                setServerError(null);
                await onSubmit(value);
            } catch (error) {
                setServerError(
                    error instanceof Error
                        ? error.message
                        : asText(t.register.serverError),
                );
            }
        },
    });

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>{asText(t.register.title)}</CardTitle>
                <CardDescription>{asText(t.register.description)}</CardDescription>
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
                        <div className="grid grid-cols-2 gap-3">
                            <form.Field name="firstName">
                                {(field) => (
                                    <InputField
                                        id={field.name}
                                        name={field.name}
                                        label={asText(t.register.firstNameLabel)}
                                        placeholder={asText(t.register.firstNamePlaceholder)}
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
                                        autoComplete="given-name"
                                    />
                                )}
                            </form.Field>

                            <form.Field name="lastName">
                                {(field) => (
                                    <InputField
                                        id={field.name}
                                        name={field.name}
                                        label={asText(t.register.lastNameLabel)}
                                        placeholder={asText(t.register.lastNamePlaceholder)}
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
                                        autoComplete="family-name"
                                    />
                                )}
                            </form.Field>
                        </div>

                        <form.Field name="email">
                            {(field) => (
                                <InputField
                                    id={field.name}
                                    name={field.name}
                                    label={asText(t.register.emailLabel)}
                                    type="email"
                                    placeholder={asText(t.register.emailPlaceholder)}
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
                                    label={asText(t.register.passwordLabel)}
                                    type="password"
                                    placeholder={asText(t.register.passwordPlaceholder)}
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
                                    autoComplete="new-password"
                                />
                            )}
                        </form.Field>

                        {serverError && (
                            <p className="text-destructive text-sm">{serverError}</p>
                        )}

                        <form.Subscribe
                            selector={(state) => [state.canSubmit, state.isSubmitting]}
                        >
                            {([canSubmit, isSubmitting]) => (
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={!canSubmit || Boolean(isSubmitting)}
                                >
                                    {isSubmitting
                                        ? asText(t.register.submitting)
                                        : asText(t.register.submit)}
                                </Button>
                            )}
                        </form.Subscribe>
                    </FieldGroup>
                </form>
            </CardContent>
            {onLoginClick && (
                <CardFooter className="justify-center">
                    <p className="text-muted-foreground text-sm">
                        {asText(t.register.alreadyHaveAccount)}{" "}
                        <button
                            type="button"
                            onClick={onLoginClick}
                            className="text-primary underline-offset-4 hover:underline"
                        >
                            {asText(t.register.login)}
                        </button>
                    </p>
                </CardFooter>
            )}
        </Card>
    );
}
