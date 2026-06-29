import { createFileRoute, redirect } from "@tanstack/react-router";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
import { Card, CardContent } from "@workspace/ui/components/card";
import { AuthLayout } from "@/components/auth-layout";

// Stub: task-11 replaces this with the real pending screen
export const Route = createFileRoute("/onboarding/pending")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user) throw redirect({ to: "/login" });
    },
    component: PendingPage,
});

function PendingPage() {
    return (
        <AuthLayout subtitle="Votre adresse est enregistrée.">
            <Card className="border-border/60 shadow-foreground/5 shadow-lg">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Votre quartier n&apos;a pas encore été attribué. Revenez
                    bientôt.
                </CardContent>
            </Card>
        </AuthLayout>
    );
}
