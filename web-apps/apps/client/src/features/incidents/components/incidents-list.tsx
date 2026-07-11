import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import type { Incident } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemTitle,
} from "@workspace/ui/components/item";
import { StatusBadge, statusTone } from "@workspace/ui/components/status-badge";
import { incidentStatusLabels } from "../lib/status-labels";

export function IncidentsList({
    incidents,
    hasNextPage,
    onLoadMore,
}: {
    incidents: Incident[];
    hasNextPage: boolean;
    onLoadMore: () => void;
}) {
    const { t, i18n } = useTranslation();
    const statusLabels = incidentStatusLabels(t);
    const fmtDate = (d: string) =>
        new Date(d).toLocaleDateString(i18n.language, {
            day: "numeric",
            month: "short",
        });

    return (
        <div className="space-y-3">
            <ItemGroup className="gap-2">
                {incidents.map((incident) => (
                    <Item key={incident.id} variant="outline" asChild>
                        <Link
                            to="/incidents/$id"
                            params={{ id: incident.id }}
                        >
                            <ItemContent>
                                <div className="flex flex-wrap items-center gap-2">
                                    <ItemTitle>{incident.title}</ItemTitle>
                                    <StatusBadge
                                        tone={statusTone(incident.status)}
                                        className="shrink-0"
                                    >
                                        {statusLabels[incident.status] ??
                                            incident.status}
                                    </StatusBadge>
                                </div>
                                {incident.description && (
                                    <ItemDescription className="line-clamp-2">
                                        {incident.description}
                                    </ItemDescription>
                                )}
                                <p className="text-muted-foreground text-xs">
                                    {t(
                                        `pages.incidents.categories.${incident.category}`,
                                    )}{" "}
                                    · {fmtDate(incident.createdAt)}
                                </p>
                            </ItemContent>
                        </Link>
                    </Item>
                ))}
            </ItemGroup>

            {hasNextPage && (
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={onLoadMore}
                >
                    {t("common.loadMore")}
                </Button>
            )}
        </div>
    );
}
