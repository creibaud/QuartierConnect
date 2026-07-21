import { useTranslation } from "react-i18next";
import { Mailbox01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@workspace/shared/lib/api";
import { clearTokens } from "@workspace/shared/lib/auth";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { AuthLayout } from "@workspace/ui/components/auth-layout";

export function PendingCoveragePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    async function handleLogout() {
        await apiPost("/auth/logout", {}).catch(() => undefined);
        clearTokens();
        queryClient.clear();
        void navigate({ to: "/login" });
    }

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
                    <div className="flex flex-col gap-2">
                        <Button
                            variant="outline"
                            onClick={() =>
                                void navigate({ to: "/onboarding/address" })
                            }
                        >
                            {t("pages.onboarding.pending.fixAddress")}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => void handleLogout()}
                        >
                            {t("auth.logout")}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </AuthLayout>
    );
}
