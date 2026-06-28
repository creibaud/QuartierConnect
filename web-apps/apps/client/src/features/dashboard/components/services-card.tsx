import { CustomerServiceIcon } from "@hugeicons/core-free-icons";
import { useTranslation } from "react-i18next";
import { useServices } from "@workspace/shared/lib/hooks/services.hooks";
import { Badge } from "@workspace/ui/components/badge";
import { EmptyBlock, FeedCard, Rows } from "./feed-card";

export function ServicesCard() {
    const { t } = useTranslation();
    const { data: services, isLoading } = useServices();
    const someServices = (services ?? []).slice(0, 4);

    return (
        <FeedCard
            title={t("pages.dashboard.neighborhoodServices")}
            to="/services"
            icon={CustomerServiceIcon}
        >
            {isLoading ? (
                <Rows count={3} />
            ) : someServices.length === 0 ? (
                <EmptyBlock icon={CustomerServiceIcon} text={t("pages.dashboard.noServices")} />
            ) : (
                <ul className="space-y-2">
                    {someServices.map((s) => (
                        <li key={s._id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate font-medium">{s.title}</span>
                            <Badge variant="secondary" className="shrink-0 text-xs">
                                {s.category}
                            </Badge>
                        </li>
                    ))}
                </ul>
            )}
        </FeedCard>
    );
}
