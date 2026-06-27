import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { apiPost } from "@workspace/shared/lib/api";
import {
    getCurrentUser,
    setTokens,
    type LoginResponse,
} from "@workspace/shared/lib/auth";
import { i18n } from "@workspace/shared/lib/i18n/index";
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
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

interface SsoTokenResponse {
    ssoToken: string;
    expiresAt: string;
    expiresIn: number;
}

const credentialsSchema = z.object({
    email: z.string().email(i18n.t("adminPages.auth.invalidEmail")),
    password: z.string().min(1, i18n.t("adminPages.auth.passwordRequired")),
});

const totpSchema = z.object({
    totpCode: z.string().length(6, i18n.t("adminPages.auth.totpLength")),
});

function isValidRedirect(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.hostname === "localhost" && parsed.protocol === "http:";
    } catch {
        return false;
    }
}

export const Route = createFileRoute("/sso/authorize")({
    validateSearch: (search: Record<string, unknown>) => ({
        state: String(search.state ?? ""),
        redirect: String(search.redirect ?? ""),
    }),
    component: SsoAuthorizePage,
});

function isAdmin(user: ReturnType<typeof getCurrentUser>): boolean {
    return user?.role === "admin";
}

function SsoAuthorizePage() {
    const { t } = useTranslation();
    const { state: ssoState, redirect } = useSearch({ from: "/sso/authorize" });
    const [isAuthenticated, setIsAuthenticated] = useState(
        () => getCurrentUser() !== null,
    );
    const [isAdminUser, setIsAdminUser] = useState(() =>
        isAdmin(getCurrentUser()),
    );
    const [loginStep, setLoginStep] = useState<"credentials" | "totp">(
        "credentials",
    );
    const [credentials, setCredentials] = useState({ email: "", password: "" });
    const [serverError, setServerError] = useState<string | null>(null);
    const [approving, setApproving] = useState(false);
    const approveCalledRef = useRef(false);

    const handleApprove = useCallback(async () => {
        if (approveCalledRef.current) return;
        approveCalledRef.current = true;
        setApproving(true);
        try {
            const data = await apiPost<SsoTokenResponse>("/auth/sso/generate", {
                surface: "java-desktop",
                state: ssoState,
            });
            window.location.href = `${redirect}?token=${data.ssoToken}&state=${encodeURIComponent(ssoState)}`;
        } catch {
            toast.error(t("adminPages.sso.tokenError"));
            setApproving(false);
            approveCalledRef.current = false;
        }
    }, [ssoState, redirect, t]);

    useEffect(() => {
        if (isAuthenticated && isAdminUser) {
            const id = setTimeout(() => handleApprove(), 0);
            return () => clearTimeout(id);
        }
    }, [isAuthenticated, isAdminUser, handleApprove]);

    const credentialsForm = useAppForm({
        defaultValues: { email: "", password: "" },
        validators: { onSubmit: credentialsSchema },
        onSubmit: ({ value }) => {
            setCredentials(value);
            setServerError(null);
            setLoginStep("totp");
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
                setIsAuthenticated(true);
                setIsAdminUser(isAdmin(getCurrentUser()));
                setServerError(null);
            } catch (err) {
                const apiErr = err as { code?: string; message?: string };
                const messages: Record<string, string> = {
                    INVALID_PASSWORD: t("adminPages.auth.invalidPassword"),
                    INVALID_TOTP: t("adminPages.auth.invalidTotp"),
                };
                setServerError(
                    messages[apiErr.code ?? ""] ??
                        apiErr.message ??
                        t("adminPages.auth.loginError"),
                );
                if (apiErr.code === "INVALID_TOTP") {
                    totpForm.setFieldValue("totpCode", "");
                }
            }
        },
    });

    if (!isValidRedirect(redirect) || !ssoState) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">
                            {t("adminPages.sso.errorTitle")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertDescription>
                                {t("adminPages.sso.invalidParams")}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">QuartierConnect</CardTitle>
                    <CardDescription>
                        {isAuthenticated && !isAdminUser
                            ? t("adminPages.sso.accessDenied")
                            : isAuthenticated && approving
                              ? t("adminPages.sso.redirecting")
                              : isAuthenticated
                                ? t("adminPages.sso.authorizeDesktop")
                                : loginStep === "credentials"
                                  ? t("adminPages.sso.loginRequired")
                                  : t("adminPages.auth.twoStepVerification")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {serverError && (
                        <Alert variant="destructive">
                            <AlertDescription>{serverError}</AlertDescription>
                        </Alert>
                    )}

                    {isAuthenticated && !isAdminUser ? (
                        <Alert variant="destructive">
                            <AlertDescription>
                                {t("adminPages.sso.adminOnlyDesktop")}
                            </AlertDescription>
                        </Alert>
                    ) : isAuthenticated && approving ? (
                        <div className="flex flex-col items-center gap-3 py-4">
                            <Spinner />
                            <p className="text-muted-foreground text-sm">
                                {t("adminPages.sso.autoLogin")}
                            </p>
                        </div>
                    ) : isAuthenticated ? (
                        <div className="space-y-4">
                            <p className="text-muted-foreground text-sm">
                                {t("adminPages.sso.consentDescription")}
                            </p>
                            <Button
                                className="w-full"
                                onClick={handleApprove}
                                disabled={approving}
                            >
                                {t("adminPages.sso.authorize")}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    window.location.href = `${redirect}?error=access_denied&state=${encodeURIComponent(ssoState)}`;
                                }}
                            >
                                {t("adminPages.sso.deny")}
                            </Button>
                        </div>
                    ) : loginStep === "credentials" ? (
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
                            className="space-y-4"
                        >
                            <p className="text-muted-foreground text-sm">
                                {t("adminPages.auth.totpForLabel")}{" "}
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
                                    setLoginStep("credentials");
                                    setServerError(null);
                                }}
                            >
                                {t("common.back")}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
