import { useState } from "react";
import { Home01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
    useMyLocation,
    useNeighborhoodStatus,
    useSubmitAddress,
} from "@/features/onboarding/hooks/address.hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

export function NeighborhoodCard() {
    const { t } = useTranslation();
    const { data: status } = useNeighborhoodStatus();
    const { data: location } = useMyLocation();
    const submitAddress = useSubmitAddress();

    const [address, setAddress] = useState("");

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        const trimmed = address.trim();
        if (!trimmed) return;

        submitAddress.mutate(trimmed, {
            onSuccess: (result) => {
                if (result.status === "assigned") {
                    toast.success(
                        t("pages.account.addressAssigned", {
                            name: result.displayName ?? result.neighborhoodId,
                        }),
                    );
                    setAddress("");
                } else if (result.status === "pending") {
                    toast.info(t("pages.account.addressPending"));
                    setAddress("");
                } else {
                    toast.error(t("pages.account.addressNotFound"));
                }
            },
            onError: () => toast.error(t("pages.account.updateError")),
        });
    }

    const neighborhoodBadge = () => {
        if (!status) return null;
        if (status.neighborhoodId) {
            return (
                <Badge variant="secondary">
                    {t("pages.account.currentNeighborhood", {
                        name: location?.neighborhood?.name ?? status.neighborhoodId,
                    })}
                </Badge>
            );
        }
        if (status.hasAddress) {
            return (
                <Badge variant="outline" className="text-muted-foreground">
                    {t("pages.account.pendingCoverage")}
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-muted-foreground">
                {t("pages.account.noNeighborhood")}
            </Badge>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <HugeiconsIcon
                        icon={Home01Icon}
                        className="text-primary size-5"
                    />
                    {t("pages.account.neighborhood")}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {neighborhoodBadge()}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="neighborhood-address">
                                {t("pages.account.addressLabel")}
                            </Label>
                            <Input
                                id="neighborhood-address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder={t(
                                    "pages.account.addressPlaceholder",
                                )}
                                disabled={submitAddress.isPending}
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={
                                submitAddress.isPending || !address.trim()
                            }
                        >
                            {t("pages.account.updateAddress")}
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    );
}
