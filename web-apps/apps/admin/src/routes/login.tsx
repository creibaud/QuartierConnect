import { useState } from "react";
import { useHead } from "@unhead/react";
import {
    createFileRoute,
    useNavigate,
    useRouter,
    useSearch,
} from "@tanstack/react-router";
import { apiPost } from "@workspace/shared/lib/api";
import {
    decodeToken,
    setTokens,
    type LoginResponse,
} from "@workspace/shared/lib/auth";
import { sanitizeRedirectPath } from "@workspace/shared/lib/redirect";
import { resolveAuthErrorMessage } from "@workspace/shared/lib/server-error";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { AuthLayout } from "@workspace/ui/components/auth-layout";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Spinner } from "@workspace/ui/components/spinner";
import { useAppForm } from "@workspace/ui/lib/form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/login")({
    validateSearch: (search: Record<string, unknown>) => ({
        forbidden: search.forbidden === true,
        redirect: sanitizeRedirectPath(search.redirect),
    }),
    component: AdminLoginPage,
});

function AdminLoginPage() {
    const { t } = useTranslation();
    useHead({ title: t("adminPages.auth.loginTitle") });
    const navigate = useNavigate();
    const router = useRouter();
    const { forbidden, redirect: redirectTo } = useSearch({ from: "/login" });

    const credentialsSchema = z.object({
        email: z.string().email(t("adminPages.auth.invalidEmail")),
        password: z.string().min(1, t("adminPages.auth.passwordRequired")),
    });

    const totpSchema = z.object({
        totpCode: z.string().length(6, t("adminPages.auth.totpLength")),
    });

    const [step, setStep] = useState<"credentials" | "totp">("credentials");
    const [credentials, setCredentials] = useState({ email: "", password: "" });
    const [serverError, setServerError] = useState<string | null>(
        forbidden ? t("adminPages.auth.adminOnly") : null,
    );

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
                const payload = decodeToken(data.accessToken);
                if (payload?.role !== "admin") {
                    setServerError(t("adminPages.auth.adminOnly"));
                    setStep("credentials");
                    return;
                }
                setTokens(data.accessToken);
                toast.success(t("adminPages.auth.loginSuccess"));
                // Back to the page that triggered the login when one was
                // recorded; the dashboard otherwise.
                if (redirectTo) {
                    router.history.push(redirectTo);
                } else {
                    navigate({ to: "/dashboard" });
                }
            } catch (err) {
                const apiErr = err as { code?: string; message?: string };
                const messages: Record<string, string> = {
                    INVALID_PASSWORD: t("adminPages.auth.invalidPassword"),
                    INVALID_TOTP: t("adminPages.auth.invalidTotp"),
                };
                setServerError(
                    resolveAuthErrorMessage(
                        apiErr.code,
                        messages,
                        t("adminPages.auth.loginError"),
                    ),
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
                    ? t("adminPages.auth.loginSubtitle")
                    : t("adminPages.auth.twoStepVerification")
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
                                        placeholder="admin@demo.fr"
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
                                {t("adminPages.auth.continue")}
                            </Button>
                        </form>
                    ) : (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                totpForm.handleSubmit();
                            }}
                            className="space-y-6"
                        >
                            <div className="space-y-1 text-center">
                                <p className="text-muted-foreground text-sm">
                                    {t("adminPages.auth.totpForLabel")}
                                </p>
                                <p className="text-foreground text-sm font-medium">
                                    {credentials.email}
                                </p>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <totpForm.AppField name="totpCode">
                                    {(field) => (
                                        <field.OtpField
                                            label={t("auth.totpCode")}
                                            autoFocus
                                            onComplete={() =>
                                                totpForm.handleSubmit()
                                            }
                                        />
                                    )}
                                </totpForm.AppField>
                            </div>
                            <totpForm.Subscribe
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
