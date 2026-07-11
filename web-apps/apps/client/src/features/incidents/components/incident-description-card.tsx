import { useTranslation } from "react-i18next";
import type { Incident } from "@workspace/shared/lib/types";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { IncidentStatusTransition } from "./incident-status-transition";
import { IncidentVoteButtons } from "./incident-vote-buttons";

export function IncidentDescriptionCard({ incident }: { incident: Incident }) {
    const { t } = useTranslation();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    {t("incidents.fields.description")}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {incident.description ? (
                    <p className="text-sm">{incident.description}</p>
                ) : (
                    <p className="text-muted-foreground text-sm">
                        {t("pages.incidentDetail.noDescription")}
                    </p>
                )}

                <IncidentVoteButtons id={incident.id} />

                <IncidentStatusTransition
                    id={incident.id}
                    status={incident.status}
                />
            </CardContent>
        </Card>
    );
}
