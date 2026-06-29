import type { FormEvent } from "react";
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

type TFunc = ReturnType<typeof useTranslation>["t"];
type NeighborhoodStatus = { hasAddress: boolean; neighborhoodId: string | null };

function NeighborhoodBadge({
    status,
    neighborhoodName,
    t,
}: {
    status: NeighborhoodStatus | undefined;
    neighborhoodName: string | null | undefined;
    t: TFunc;
}) {
    if (!status) return null;
    if (status.neighborhoodId) {
        return (
            <Badge variant="secondary">
                {t("pages.account.currentNeighborhood", {
                    name: neighborhoodName ?? "…",
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
}

export function NeighborhoodCard() {
    const { t } = useTranslation();
    const { data: status } = useNeighborhoodStatus();
    const { data: location } = useMyLocation();
    const submitAddress = useSubmitAddress();

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const trimmed = String(new FormData(form).get("address") ?? "").trim();
        if (!trimmed) return;

        submitAddress.mutate(trimmed, {
            onSuccess: (result) => {
                if (result.status === "assigned") {
                    toast.success(
                        t("pages.account.addressAssigned", {
                            name: result.displayName ?? result.neighborhoodId,
                        }),
                    );
                    form.reset();
                } else if (result.status === "pending") {
                    toast.info(t("pages.account.addressPending"));
                    form.reset();
                } else {
                    toast.error(t("pages.account.addressNotFound"));
                }
            },
            onError: () => toast.error(t("pages.account.updateError")),
        });
    }

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
                    <NeighborhoodBadge
                        status={status}
                        neighborhoodName={location?.neighborhood?.name}
                        t={t}
                    />
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="neighborhood-address">
                                {t("pages.account.addressLabel")}
                            </Label>
                            {/* Uncontrolled + key: pre-fills the current address and
                                re-applies it when the loaded value changes, without a
                                state-syncing effect. */}
                            <Input
                                key={location?.address ?? "empty"}
                                id="neighborhood-address"
                                name="address"
                                defaultValue={location?.address ?? ""}
                                placeholder={t("pages.account.addressPlaceholder")}
                                disabled={submitAddress.isPending}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={submitAddress.isPending}>
                            {t("pages.account.updateAddress")}
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    );
}
