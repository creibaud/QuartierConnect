import { useState } from "react";
import { useHead } from "@unhead/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { apiPost } from "@workspace/shared/lib/api";
import { setTokens, type LoginResponse } from "@workspace/shared/lib/auth";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Spinner } from "@workspace/ui/components/spinner";
import { useAppForm } from "@workspace/ui/lib/form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthLayout } from "../components/auth-layout";

export const Route = createFileRoute("/login")({
    component: LoginPage,
});

function LoginPage() {
    const { t } = useTranslation();
    useHead({ title: t("pages.login.pageTitle") });
    const navigate = useNavigate();

    const credentialsSchema = z.object({
        email: z.string().email(t("auth.validation.invalidEmail")),
        password: z.string().min(1, t("auth.validation.passwordRequired")),
    });

    const totpSchema = z.object({
        totpCode: z.string().length(6, t("auth.validation.totpLength")),
    });
    const [step, setStep] = useState<"credentials" | "totp">("credentials");
    const [credentials, setCredentials] = useState({ email: "", password: "" });
    const [serverError, setServerError] = useState<string | null>(null);

    const credentialsForm = useAppForm({
        defaultValues: { email: "", password: "" },
        validators: { onSubmit: credentialsSchema },
        onSubmit: ({ value }) => {
            setCredentials(value);
            setServerError(null);
            setStep("totp");
        },
    });

    const totpForm = useAppForm({
        defaultValues: { totpCode: "" },
        validators: { onSubmit: totpSchema },
        onSubmit: async ({ value }) => {
            try {
                const data = await apiPost<LoginResponse>("/auth/login", {
                    email: credentials.email,
                    password: credentials.password,
                    totpCode: value.totpCode,
                });
                setTokens(data.accessToken);
                toast.success(t("auth.loginSuccess"));
                navigate({ to: "/dashboard" });
            } catch (err) {
                const apiErr = err as { code?: string; message?: string };
                const messages: Record<string, string> = {
                    INVALID_PASSWORD: t("auth.errors.invalidCredentials"),
                    INVALID_TOTP: t("auth.errors.invalidTotp"),
                };
                setServerError(
                    messages[apiErr.code ?? ""] ??
                        apiErr.message ??
                        t("auth.errors.loginFailed"),
                );
                if (apiErr.code === "INVALID_TOTP") {
                    totpForm.setFieldValue("totpCode", "");
                }
            }
        },
    });

    return (
        <AuthLayout
            subtitle={
                step === "credentials"
                    ? t("pages.login.subtitle")
                    : t("pages.login.twoFactorSubtitle")
            }
        >
            <Card className="border-border/60 shadow-foreground/5 shadow-lg">
                <CardContent className="space-y-4">
                    {serverError && (
                        <Alert variant="destructive">
                            <AlertDescription>{serverError}</AlertDescription>
                        </Alert>
                    )}

                    {step === "credentials" ? (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                credentialsForm.handleSubmit();
                            }}
                            className="space-y-4"
                        >
                            <credentialsForm.AppField name="email">
                                {(field) => (
                                    <field.TextField
                                        label={t("auth.email")}
                                        type="email"
                                        placeholder="alice@demo.fr"
                                        autoFocus
                                    />
                                )}
                            </credentialsForm.AppField>
                            <credentialsForm.AppField name="password">
                                {(field) => (
                                    <field.TextField
                                        label={t("auth.password")}
                                        type="password"
                                    />
                                )}
                            </credentialsForm.AppField>
                            <Button type="submit" className="w-full">
                                {t("common.continue")}
                            </Button>
                            <p className="text-muted-foreground text-center text-sm">
                                {t("pages.login.noAccount")}{" "}
                                <Link
                                    to="/register"
                                    className="text-primary font-medium underline-offset-4 hover:underline"
                                >
                                    {t("auth.register")}
                                </Link>
                            </p>
                        </form>
                    ) : (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                totpForm.handleSubmit();
                            }}
                            className="space-y-4"
                        >
                            <p className="text-muted-foreground text-sm">
                                {t("pages.login.totpFor")}{" "}
                                <span className="text-foreground font-medium">
                                    {credentials.email}
                                </span>
                                .
                            </p>
                            <totpForm.AppField name="totpCode">
                                {(field) => (
                                    <field.OtpField label={t("auth.totpCode")} />
                                )}
                            </totpForm.AppField>
                            <totpForm.Subscribe selector={(s) => s.isSubmitting}>
                                {(isSubmitting) => (
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <Spinner className="mr-2" />
                                        ) : null}
                                        {t("auth.login")}
                                    </Button>
                                )}
                            </totpForm.Subscribe>
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full"
                                onClick={() => {
                                    setStep("credentials");
                                    setServerError(null);
                                }}
                            >
                                {t("common.back")}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </AuthLayout>
    );
}
