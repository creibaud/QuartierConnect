import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
    completeTotpLogin,
    login,
    redirectToSSOCallback,
    syncSessionToDesktop,
} from "@workspace/auth/api";
import { LoginForm } from "@workspace/auth/components/login-form";
import { TotpForm } from "@workspace/auth/components/totp-form";
import { useAuth } from "@workspace/auth/context";
import { isPendingTotp } from "@workspace/auth/types";

export const Route = createFileRoute("/$locale/login")({
    beforeLoad: ({ context, params }) => {
        if (context.auth.accessToken && context.auth.user?.role === "admin") {
            throw redirect({
                to: "/$locale",
                params: { locale: params.locale },
            });
        }
    },
    component: LoginPage,
});

type LoginStep = "credentials" | "totp";

function LoginPage() {
    const navigate = useNavigate();
    const { locale } = Route.useParams();
    const auth = useAuth();
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
            auth.setSession(result.accessToken, result.user);
            redirectToSSOCallback(result);
            // Sync session to desktop app via SessionServer
            void syncSessionToDesktop(result);
            void navigate({ to: "/$locale", params: { locale } });
        },
    });

    const totpMutation = useMutation({
        mutationFn: ({ code }: { code: string }) => {
            if (!pendingTotpToken) throw new Error("No pending TOTP token");
            return completeTotpLogin(pendingTotpToken, code);
        },
        onSuccess: (result) => {
            redirectToSSOCallback(result);
            // Sync session to desktop app via SessionServer
            void syncSessionToDesktop(result);
            auth.setSession(result.accessToken, result.user);
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
