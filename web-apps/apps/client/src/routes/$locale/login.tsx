import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { completeTotpLogin, login } from "@workspace/auth/api";
import { LoginForm } from "@workspace/auth/components/login-form";
import { TotpForm } from "@workspace/auth/components/totp-form";
import { isPendingTotp, type AuthTokens } from "@workspace/auth/types";

export const Route = createFileRoute("/$locale/login")({
    beforeLoad: ({ params }) => {
        if (localStorage.getItem("accessToken")) {
            throw redirect({
                to: "/$locale",
                params: { locale: params.locale },
            });
        }
    },
    component: LoginPage,
});

type LoginStep = "credentials" | "totp";

function saveSession(tokens: AuthTokens) {
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
    localStorage.setItem("userRole", tokens.user.role);
}

function LoginPage() {
    const navigate = useNavigate();
    const { locale } = Route.useParams();
    const [step, setStep] = useState<LoginStep>("credentials");
    const [pendingTotpToken, setPendingTotpToken] = useState<string | null>(
        null,
    );

    const loginMutation = useMutation({
        mutationFn: ({
            email,
            password,
        }: {
            email: string;
            password: string;
        }) => login(email, password),
        onSuccess: (result) => {
            if (isPendingTotp(result)) {
                setPendingTotpToken(result.totpToken);
                setStep("totp");
                return;
            }
            saveSession(result);
            void navigate({ to: "/$locale", params: { locale } });
        },
    });

    const totpMutation = useMutation({
        mutationFn: ({ code }: { code: string }) => {
            if (!pendingTotpToken) throw new Error("No pending TOTP token");
            return completeTotpLogin(pendingTotpToken, code);
        },
        onSuccess: (result) => {
            saveSession(result);
            void navigate({ to: "/$locale", params: { locale } });
        },
    });

    function handleBackToCredentials() {
        setStep("credentials");
        setPendingTotpToken(null);
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            {step === "credentials" ? (
                <LoginForm
                    onRegisterClick={() =>
                        navigate({
                            to: "/$locale/register",
                            params: { locale },
                        })
                    }
                    onSubmit={async (values) => {
                        await loginMutation.mutateAsync(values);
                    }}
                />
            ) : (
                <TotpForm
                    onBack={handleBackToCredentials}
                    onSubmit={async (values) => {
                        await totpMutation.mutateAsync(values);
                    }}
                />
            )}
        </div>
    );
}
