import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { register } from "@workspace/auth/api";
import { RegisterForm } from "@workspace/auth/components/register-form";
import type { AuthTokens } from "@workspace/auth/types";

export const Route = createFileRoute("/$locale/register")({
    beforeLoad: ({ params }) => {
        if (localStorage.getItem("accessToken")) {
            throw redirect({
                to: "/$locale",
                params: { locale: params.locale },
            });
        }
    },
    component: RegisterPage,
});

function saveSession(tokens: AuthTokens) {
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
    localStorage.setItem("userRole", tokens.user.role);
}

function RegisterPage() {
    const navigate = useNavigate();
    const { locale } = Route.useParams();

    const registerMutation = useMutation({
        mutationFn: (values: {
            email: string;
            password: string;
            firstName: string;
            lastName: string;
        }) =>
            register(
                values.email,
                values.password,
                values.firstName,
                values.lastName,
            ),
        onSuccess: (result) => {
            saveSession(result);
            void navigate({ to: "/$locale", params: { locale } });
        },
    });

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <RegisterForm
                onLoginClick={() =>
                    navigate({ to: "/$locale/login", params: { locale } })
                }
                onSubmit={async (values) => {
                    await registerMutation.mutateAsync(values);
                }}
            />
        </div>
    );
}
