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
                <EmptyBlock
                    icon={CustomerServiceIcon}
                    title={t("pages.dashboard.noServices")}
                    subtitle={t("pages.dashboard.noServicesHint")}
                />
            ) : (
                <ul className="space-y-3">
                    {someServices.map((s) => (
                        <li key={s._id} className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-medium">{s.title}</span>
                                <Badge variant="secondary" className="shrink-0 text-[10px]">{s.category}</Badge>
                            </div>
                            {s.description ? (
                                <p className="text-muted-foreground line-clamp-1 text-xs">{s.description}</p>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
        </FeedCard>
    );
}
