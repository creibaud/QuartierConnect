import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { register } from "@workspace/auth/api";
import { RegisterForm } from "@workspace/auth/components/register-form";
import { useAuth } from "@workspace/auth/context";

export const Route = createFileRoute("/$locale/register")({
    beforeLoad: ({ context, params }) => {
        if (context.auth.accessToken) {
            throw redirect({
                to: "/$locale",
                params: { locale: params.locale },
            });
        }
    },
    component: RegisterPage,
});

function RegisterPage() {
    const navigate = useNavigate();
    const { locale } = Route.useParams();
    const auth = useAuth();

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
            auth.setSession(result.accessToken, result.user);
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
