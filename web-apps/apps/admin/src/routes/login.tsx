import { useState } from "react";
import {
    createFileRoute,
    useNavigate,
    useSearch,
} from "@tanstack/react-router";
import { apiPost } from "@workspace/shared/lib/api";
import {
    decodeToken,
    setTokens,
    type LoginResponse,
} from "@workspace/shared/lib/auth";
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

const credentialsSchema = z.object({
    email: z.string().email("Email invalide"),
    password: z.string().min(1, "Mot de passe requis"),
});

const totpSchema = z.object({
    totpCode: z.string().length(6, "Le code doit contenir 6 chiffres"),
});

export const Route = createFileRoute("/login")({
    validateSearch: (search: Record<string, unknown>) => ({
        forbidden: search.forbidden === true,
    }),
    component: AdminLoginPage,
});

function AdminLoginPage() {
    const navigate = useNavigate();
    const { forbidden } = useSearch({ from: "/login" });
    const [step, setStep] = useState<"credentials" | "totp">("credentials");
    const [credentials, setCredentials] = useState({ email: "", password: "" });
    const [serverError, setServerError] = useState<string | null>(
        forbidden ? "Accès réservé aux administrateurs" : null,
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
                    setServerError("Accès réservé aux administrateurs");
                    setStep("credentials");
                    return;
                }
                setTokens(data.accessToken, data.refreshToken);
                toast.success("Connexion admin réussie");
                navigate({ to: "/dashboard" });
            } catch (err) {
                const apiErr = err as { code?: string; message?: string };
                const messages: Record<string, string> = {
                    INVALID_PASSWORD: "Email ou mot de passe incorrect",
                    INVALID_TOTP: "Code TOTP invalide",
                };
                setServerError(
                    messages[apiErr.code ?? ""] ??
                        apiErr.message ??
                        "Erreur de connexion",
                );
                if (apiErr.code === "INVALID_TOTP") {
                    totpForm.setFieldValue("totpCode", "");
                }
            }
        },
    });

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">
                        QuartierConnect Admin
                    </CardTitle>
                    <CardDescription>
                        {step === "credentials"
                            ? "Connexion espace administrateur"
                            : "Vérification en deux étapes"}
                    </CardDescription>
                </CardHeader>
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
                                        label="Email"
                                        type="email"
                                        placeholder="admin@demo.fr"
                                        autoFocus
                                    />
                                )}
                            </credentialsForm.AppField>
                            <credentialsForm.AppField name="password">
                                {(field) => (
                                    <field.TextField
                                        label="Mot de passe"
                                        type="password"
                                    />
                                )}
                            </credentialsForm.AppField>
                            <Button type="submit" className="w-full">
                                Continuer
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
                                Code TOTP pour{" "}
                                <span className="text-foreground font-medium">
                                    {credentials.email}
                                </span>
                                .
                            </p>
                            <totpForm.AppField name="totpCode">
                                {(field) => (
                                    <field.OtpField label="Code TOTP" />
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
                                        Se connecter
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
                                Retour
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
