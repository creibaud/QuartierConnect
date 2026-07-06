import { useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useHead } from "@unhead/react";
import { apiPost } from "@workspace/shared/lib/api";
import { setTokens, type LoginResponse } from "@workspace/shared/lib/auth";
import { isValidPhone, normalizePhone } from "@workspace/shared/lib/phone";
import { resolveAuthErrorMessage } from "@workspace/shared/lib/server-error";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { AuthLayout } from "@workspace/ui/components/auth-layout";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Label } from "@workspace/ui/components/label";
import { Spinner } from "@workspace/ui/components/spinner";
import { useAppForm } from "@workspace/ui/lib/form";
import { toast } from "sonner";
import { z } from "zod";

interface RegisterResponse {
    otpauthUrl: string;
}

function ConsentNoticeDialog() {
    const { t } = useTranslation();
    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className="text-primary pl-7 text-sm font-medium underline-offset-4 hover:underline"
                >
                    {t("pages.register.consentNoticeLink")}
                </button>
            </DialogTrigger>
            <DialogContent closeLabel={t("common.close")}>
                <DialogHeader>
                    <DialogTitle>
                        {t("pages.register.consentNoticeTitle")}
                    </DialogTitle>
                    <DialogDescription className="text-left">
                        {t("pages.register.consentNoticeBody")}
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
}

export const Route = createFileRoute("/register")({
    component: RegisterPage,
});

function RegisterPage() {
    const { t } = useTranslation();
    useHead({ title: t("pages.register.pageTitle") });
    const navigate = useNavigate();

    const requiredSchema = z
        .string()
        .trim()
        .min(1, t("auth.validation.required"));
    const emailSchema = z.string().email(t("auth.validation.invalidEmail"));
    const phoneSchema = z
        .string()
        .refine((value) => !value.trim() || isValidPhone(value), {
            message: t("auth.validation.phoneInvalid"),
        });
    const passwordSchema = z.string().min(8, t("auth.validation.passwordMin"));

    const registerSchema = z
        .object({
            firstName: requiredSchema,
            lastName: requiredSchema,
            email: emailSchema,
            phone: phoneSchema,
            password: passwordSchema,
            confirmPassword: z.string(),
            consent: z.boolean().refine((value) => value, {
                message: t("auth.validation.consentRequired"),
            }),
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
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            password: "",
            confirmPassword: "",
            consent: false,
        },
        validators: { onSubmit: registerSchema },
        onSubmit: async ({ value }) => {
            try {
                const data = await apiPost<RegisterResponse>("/auth/register", {
                    email: value.email,
                    password: value.password,
                    firstName: value.firstName,
                    lastName: value.lastName,
                    phone: value.phone.trim()
                        ? normalizePhone(value.phone)
                        : undefined,
                    consent: value.consent,
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
                    resolveAuthErrorMessage(
                        apiErr.code,
                        messages,
                        t("auth.errors.registerFailed"),
                    ),
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
            <AuthLayout subtitle={t("pages.register.subtitle")}>
                <Card className="border-border/60 shadow-foreground/5 shadow-lg">
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
                            <div className="grid grid-cols-2 gap-3">
                                <registerForm.AppField
                                    name="firstName"
                                    validators={{
                                        onBlur: requiredSchema,
                                        onChange: requiredSchema,
                                    }}
                                >
                                    {(field) => (
                                        <field.TextField
                                            label={t(
                                                "pages.register.firstName",
                                            )}
                                            placeholder="Camille"
                                            autoFocus
                                            autoComplete="given-name"
                                        />
                                    )}
                                </registerForm.AppField>
                                <registerForm.AppField
                                    name="lastName"
                                    validators={{
                                        onBlur: requiredSchema,
                                        onChange: requiredSchema,
                                    }}
                                >
                                    {(field) => (
                                        <field.TextField
                                            label={t("pages.register.lastName")}
                                            placeholder="Dupont"
                                            autoComplete="family-name"
                                        />
                                    )}
                                </registerForm.AppField>
                            </div>
                            <registerForm.AppField
                                name="email"
                                validators={{
                                    onBlur: emailSchema,
                                    onChange: emailSchema,
                                }}
                            >
                                {(field) => (
                                    <field.TextField
                                        label={t("auth.email")}
                                        type="email"
                                        placeholder="prenom@exemple.fr"
                                        autoComplete="email"
                                    />
                                )}
                            </registerForm.AppField>
                            <registerForm.AppField
                                name="phone"
                                validators={{
                                    onBlur: phoneSchema,
                                    onChange: phoneSchema,
                                }}
                            >
                                {(field) => (
                                    <field.TextField
                                        label={t(
                                            "pages.register.phoneOptional",
                                        )}
                                        type="tel"
                                        placeholder="+33612345678"
                                        autoComplete="tel"
                                    />
                                )}
                            </registerForm.AppField>
                            <registerForm.AppField
                                name="password"
                                validators={{
                                    onBlur: passwordSchema,
                                    onChange: passwordSchema,
                                }}
                            >
                                {(field) => (
                                    <field.TextField
                                        label={t("auth.password")}
                                        type="password"
                                        placeholder={t(
                                            "auth.validation.passwordMin",
                                        )}
                                        autoComplete="new-password"
                                    />
                                )}
                            </registerForm.AppField>
                            <registerForm.AppField
                                name="confirmPassword"
                                validators={{
                                    onChangeListenTo: ["password"],
                                    onChange: ({ value, fieldApi }) =>
                                        value ===
                                        fieldApi.form.getFieldValue("password")
                                            ? undefined
                                            : t(
                                                  "auth.validation.passwordMismatch",
                                              ),
                                    onBlur: ({ value, fieldApi }) =>
                                        value ===
                                        fieldApi.form.getFieldValue("password")
                                            ? undefined
                                            : t(
                                                  "auth.validation.passwordMismatch",
                                              ),
                                }}
                            >
                                {(field) => (
                                    <field.TextField
                                        label={t(
                                            "pages.register.confirmPassword",
                                        )}
                                        type="password"
                                        autoComplete="new-password"
                                    />
                                )}
                            </registerForm.AppField>
                            <registerForm.AppField name="consent">
                                {(field) => (
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                id="register-consent"
                                                checked={field.state.value}
                                                onCheckedChange={(checked) =>
                                                    field.handleChange(
                                                        checked === true,
                                                    )
                                                }
                                                aria-invalid={
                                                    field.state.meta.errors
                                                        .length > 0
                                                }
                                                className="mt-0.5"
                                            />
                                            <Label
                                                htmlFor="register-consent"
                                                className="text-muted-foreground text-sm leading-snug font-normal"
                                            >
                                                {t(
                                                    "pages.register.consentLabel",
                                                )}
                                            </Label>
                                        </div>
                                        <ConsentNoticeDialog />
                                    </div>
                                )}
                            </registerForm.AppField>
                            <registerForm.Subscribe
                                selector={(s) =>
                                    [
                                        s.isSubmitting,
                                        registerSchema.safeParse(s.values)
                                            .success,
                                    ] as const
                                }
                            >
                                {([isSubmitting, isFormValid]) => (
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={isSubmitting || !isFormValid}
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
                                    className="text-primary font-medium underline-offset-4 hover:underline"
                                >
                                    {t("auth.login")}
                                </Link>
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </AuthLayout>
        );
    }

    const totpSecret = (() => {
        if (!otpauthUrl) return "";
        try {
            return new URL(otpauthUrl).searchParams.get("secret") ?? "";
        } catch {
            return "";
        }
    })();

    const copySecret = () => {
        navigator.clipboard
            .writeText(totpSecret)
            .then(() => toast.success(t("pages.register.secretCopied")))
            .catch(() => toast.error(t("pages.register.copyFailed")));
    };

    return (
        <AuthLayout subtitle={t("pages.register.mfaSubtitle")}>
            <Card className="border-border/60 shadow-foreground/5 shadow-lg">
                <CardContent className="space-y-6">
                    {serverError && (
                        <Alert variant="destructive">
                            <AlertDescription>{serverError}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-3">
                        <p className="text-muted-foreground flex items-start gap-2 text-sm">
                            <span className="bg-primary text-primary-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                                1
                            </span>
                            {t("pages.register.mfaStep1")}
                        </p>
                        <div
                            data-testid="totp-qr"
                            className="flex justify-center rounded-xl border bg-white p-5"
                        >
                            <QRCode value={otpauthUrl} size={200} />
                        </div>
                        {totpSecret && (
                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs">
                                    {t("pages.register.secretLabel")}
                                </p>
                                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                                    <code className="text-foreground flex-1 font-mono text-sm tracking-widest break-all">
                                        {totpSecret}
                                    </code>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="shrink-0"
                                        onClick={copySecret}
                                    >
                                        {t("pages.register.copySecret")}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            totpForm.handleSubmit();
                        }}
                        className="space-y-4"
                    >
                        <p className="text-muted-foreground flex items-start gap-2 text-sm">
                            <span className="bg-primary text-primary-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                                2
                            </span>
                            {t("pages.register.mfaStep2")}
                        </p>
                        <div className="flex flex-col items-center">
                            <totpForm.AppField name="totpCode">
                                {(field) => (
                                    <field.OtpField
                                        label={t(
                                            "pages.register.verificationCode",
                                        )}
                                        autoFocus
                                        onComplete={() =>
                                            totpForm.handleSubmit()
                                        }
                                    />
                                )}
                            </totpForm.AppField>
                        </div>
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
        </AuthLayout>
    );
}
