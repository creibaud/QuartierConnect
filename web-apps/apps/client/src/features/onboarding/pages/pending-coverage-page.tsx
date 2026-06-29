import { useNavigate } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { AuthLayout } from "@/components/auth-layout";

export function PendingCoveragePage() {
    const navigate = useNavigate();

    return (
        <AuthLayout subtitle="Votre adresse est en attente de couverture.">
            <Card className="border-border/60 shadow-foreground/5 shadow-lg">
                <CardContent className="space-y-6 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        Aucun quartier ne couvre encore ton adresse. Le
                        superadmin a été prévenu et ajoutera ton quartier
                        bientôt.
                    </p>
                    <Button
                        variant="outline"
                        onClick={() =>
                            void navigate({ to: "/onboarding/address" })
                        }
                    >
                        Corriger mon adresse
                    </Button>
                </CardContent>
            </Card>
        </AuthLayout>
    );
}
