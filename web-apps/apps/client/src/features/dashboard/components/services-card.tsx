import { CustomerServiceIcon } from "@hugeicons/core-free-icons";
import { useTranslation } from "react-i18next";
import { useServices } from "@workspace/shared/lib/hooks/services.hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@workspace/ui/components/item";
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
                <ItemGroup>
                    {someServices.map((s) => (
                        <Item key={s._id} variant="outline" size="sm">
                            <ItemContent>
                                <ItemTitle>{s.title}</ItemTitle>
                                {s.description ? <ItemDescription>{s.description}</ItemDescription> : null}
                            </ItemContent>
                            <ItemActions>
                                <Badge variant="secondary" className="text-[10px]">{s.category}</Badge>
                            </ItemActions>
                        </Item>
                    ))}
                </ItemGroup>
            )}
        </FeedCard>
    );
}
