import { useTranslation } from "react-i18next";
import { Mailbox01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { AuthLayout } from "@workspace/ui/components/auth-layout";

export function PendingCoveragePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <AuthLayout subtitle={t("pages.onboarding.pending.subtitle")}>
            <Card className="border-border/60 shadow-foreground/5 shadow-lg">
                <CardContent className="space-y-5 py-8 text-center">
                    <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-full">
                        <HugeiconsIcon
                            icon={Mailbox01Icon}
                            size={24}
                            strokeWidth={1.5}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {t("pages.onboarding.pending.teamNotified")}
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
