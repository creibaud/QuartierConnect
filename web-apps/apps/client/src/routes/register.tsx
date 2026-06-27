import { useState } from "react";
import QRCode from "react-qr-code";
import { useHead } from "@unhead/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { apiPost } from "@workspace/shared/lib/api";
import { setTokens, type LoginResponse } from "@workspace/shared/lib/auth";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { Spinner } from "@workspace/ui/components/spinner";
import { useAppForm } from "@workspace/ui/lib/form";
import { toast } from "sonner";
import { z } from "zod";

interface RegisterResponse {
    otpauthUrl: string;
}

export const Route = createFileRoute("/register")({
    component: RegisterPage,
});

function RegisterPage() {
    const { t } = useTranslation();
    useHead({ title: t("pages.register.pageTitle") });
    const navigate = useNavigate();

    const registerSchema = z
        .object({
            email: z.string().email(t("auth.validation.invalidEmail")),
            password: z.string().min(8, t("auth.validation.passwordMin")),
            confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
            message: t("auth.validation.passwordMismatch"),
            path: ["confirmPassword"],
        });

    const totpSchema = z.object({
        totpCode: z.string().length(6, t("auth.validation.totpLength")),
    });
    const [step, setStep] = useState<"form" | "qrcode">("form");
    const [otpauthUrl, setOtpauthUrl] = useState("");
    const [loginCredentials, setLoginCredentials] = useState({
        email: "",
        password: "",
    });
    const [serverError, setServerError] = useState<string | null>(null);

    const registerForm = useAppForm({
        defaultValues: { email: "", password: "", confirmPassword: "" },
        validators: { onSubmit: registerSchema },
        onSubmit: async ({ value }) => {
            try {
                const data = await apiPost<RegisterResponse>("/auth/register", {
                    email: value.email,
                    password: value.password,
                });
                setOtpauthUrl(data.otpauthUrl);
                setLoginCredentials({
                    email: value.email,
                    password: value.password,
                });
                setServerError(null);
                setStep("qrcode");
            } catch (err) {
                const apiErr = err as { code?: string; message?: string };
                const messages: Record<string, string> = {
                    EMAIL_ALREADY_EXISTS: t("auth.errors.emailExists"),
                };
                setServerError(
                    messages[apiErr.code ?? ""] ??
                        apiErr.message ??
                        t("auth.errors.registerFailed"),
                );
            }
        },
    });

    const totpForm = useAppForm({
        defaultValues: { totpCode: "" },
        validators: { onSubmit: totpSchema },
        onSubmit: async ({ value }) => {
            try {
                const data = await apiPost<LoginResponse>("/auth/login", {
                    email: loginCredentials.email,
                    password: loginCredentials.password,
                    totpCode: value.totpCode,
                });
                setTokens(data.accessToken);
                toast.success(t("pages.register.accountCreated"));
                navigate({ to: "/dashboard" });
            } catch {
                setServerError(t("auth.errors.invalidTotpCheckApp"));
                totpForm.setFieldValue("totpCode", "");
            }
        },
    });

    if (step === "form") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">
                            {t("pages.register.title")}
                        </CardTitle>
                        <CardDescription>
                            {t("pages.register.subtitle")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {serverError && (
                            <Alert variant="destructive">
                                <AlertDescription>
                                    {serverError}
                                </AlertDescription>
                            </Alert>
                        )}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                registerForm.handleSubmit();
                            }}
                            className="space-y-4"
                        >
                            <registerForm.AppField name="email">
                                {(field) => (
                                    <field.TextField
                                        label={t("auth.email")}
                                        type="email"
                                        placeholder="alice@demo.fr"
                                        autoFocus
                                    />
                                )}
                            </registerForm.AppField>
                            <registerForm.AppField name="password">
                                {(field) => (
                                    <field.TextField
                                        label={t("auth.password")}
                                        type="password"
                                        placeholder={t(
                                            "auth.validation.passwordMin",
                                        )}
                                    />
                                )}
                            </registerForm.AppField>
                            <registerForm.AppField name="confirmPassword">
                                {(field) => (
                                    <field.TextField
                                        label={t("pages.register.confirmPassword")}
                                        type="password"
                                    />
                                )}
                            </registerForm.AppField>
                            <registerForm.Subscribe
                                selector={(s) => s.isSubmitting}
                            >
                                {(isSubmitting) => (
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <Spinner className="mr-2" />
                                        ) : null}
                                        {t("pages.register.createMyAccount")}
                                    </Button>
                                )}
                            </registerForm.Subscribe>
                            <p className="text-muted-foreground text-center text-sm">
                                {t("pages.register.alreadyRegistered")}{" "}
                                <Link
                                    to="/login"
                                    className="text-primary underline-offset-4 hover:underline"
                                >
                                    {t("auth.login")}
                                </Link>
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">
                        {t("pages.register.mfaTitle")}
                    </CardTitle>
                    <CardDescription>
                        {t("pages.register.mfaSubtitle")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {serverError && (
                        <Alert variant="destructive">
                            <AlertDescription>{serverError}</AlertDescription>
                        </Alert>
                    )}
                    <div className="flex justify-center rounded-lg bg-white p-4">
                        <QRCode value={otpauthUrl} size={200} />
                    </div>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            totpForm.handleSubmit();
                        }}
                        className="space-y-4"
                    >
                        <totpForm.AppField name="totpCode">
                            {(field) => (
                                <field.OtpField
                                    label={t("pages.register.verificationCode")}
                                />
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
                                    {t("pages.register.confirmAndLogin")}
                                </Button>
                            )}
                        </totpForm.Subscribe>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
