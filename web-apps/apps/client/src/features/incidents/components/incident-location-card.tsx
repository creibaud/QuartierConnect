import { useTranslation } from "react-i18next";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { Map, Marker } from "@workspace/ui/components/map";

export function IncidentLocationCard({
    lat,
    lng,
}: {
    lat: number;
    lng: number;
}) {
    const { t } = useTranslation();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    {t("pages.incidentDetail.locationTitle")}
                </CardTitle>
                <CardDescription>
                    {t("pages.incidentDetail.locationDescription")}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative isolate">
                    <Map
                        center={[lat, lng]}
                        zoom={16}
                        className="h-64 min-h-64 w-full"
                    >
                        <Marker variant="incident" position={[lat, lng]} />
                    </Map>
                </div>
            </CardContent>
        </Card>
    );
}
