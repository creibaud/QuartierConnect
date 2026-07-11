import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import type { Recommendation } from "@workspace/shared/lib/types";
import { Card, CardContent } from "@workspace/ui/components/card";
import { TYPE_ROUTES } from "../lib/recommendation-meta";
import { RecommendationSummary } from "./recommendation-summary";

export function RecommendationCard({
    recommendation,
}: {
    recommendation: Recommendation;
}) {
    return (
        <Link
            to={TYPE_ROUTES[recommendation.type]}
            className="focus-visible:ring-ring block rounded-xl focus-visible:ring-2 focus-visible:outline-none"
        >
            <Card className="hover:ring-primary/40 py-0 transition-shadow">
                <CardContent className="flex items-start gap-3 p-4">
                    <RecommendationSummary recommendation={recommendation} />
                    <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        className="text-muted-foreground size-5 shrink-0 self-center"
                    />
                </CardContent>
            </Card>
        </Link>
    );
}
