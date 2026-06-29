import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { AuthLayout } from "@/components/auth-layout";

export function PendingCoveragePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <AuthLayout subtitle={t("pages.onboarding.pending.subtitle")}>
            <Card className="border-border/60 shadow-foreground/5 shadow-lg">
                <CardContent className="space-y-6 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t("pages.onboarding.pending.description")}
                    </p>
                    <Button
                        variant="outline"
                        onClick={() =>
                            void navigate({ to: "/onboarding/address" })
                        }
                    >
                        {t("pages.onboarding.pending.fixAddress")}
                    </Button>
                </CardContent>
            </Card>
        </AuthLayout>
    );
}
