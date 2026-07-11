import { useTranslation } from "react-i18next";
import { Message01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import type { Recommendation } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { toast } from "sonner";
import { useContact } from "@/features/services/hooks/services-core.hooks";
import { RecommendationSummary } from "./recommendation-summary";

export function NeighborRecommendationCard({
    recommendation,
}: {
    recommendation: Recommendation;
}) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const contact = useContact();

    async function openConversation() {
        try {
            const { id } = await contact.mutateAsync(recommendation.id);
            void navigate({ to: "/messages", search: { conversation: id } });
        } catch {
            toast.error(t("recommendations.contactError"));
        }
    }

    return (
        <Card className="py-0">
            <CardContent className="flex items-start gap-3 p-4">
                <RecommendationSummary recommendation={recommendation} />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 self-center"
                    disabled={contact.isPending}
                    onClick={() => void openConversation()}
                >
                    <HugeiconsIcon icon={Message01Icon} />
                    {t("recommendations.contact")}
                </Button>
            </CardContent>
        </Card>
    );
}
