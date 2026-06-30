import type { FormEvent } from "react";
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
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
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

interface AddressFormProps {
    initialAddress: string;
    isPending: boolean;
    onSubmit: (trimmed: string) => void;
    t: TFunc;
}

function AddressForm({ initialAddress, isPending, onSubmit, t }: AddressFormProps) {
    const [address, setAddress] = useState(initialAddress);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const trimmed = address.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
                <Label htmlFor="neighborhood-address">
                    {t("pages.account.addressLabel")}
                </Label>
                <AddressAutocomplete
                    id="neighborhood-address"
                    value={address}
                    onChange={setAddress}
                    onSelect={(s) => setAddress(s.label)}
                    placeholder={t("pages.account.addressPlaceholder")}
                    disabled={isPending}
                />
            </div>
            <Button type="submit" disabled={isPending}>
                {t("pages.account.updateAddress")}
            </Button>
        </form>
    );
}

export function NeighborhoodCard() {
    const { t } = useTranslation();
    const { data: status } = useNeighborhoodStatus();
    const { data: location } = useMyLocation();
    const submitAddress = useSubmitAddress();

    function handleSubmit(trimmed: string) {
        submitAddress.mutate(trimmed, {
            onSuccess: (result) => {
                if (result.status === "assigned") {
                    toast.success(
                        t("pages.account.addressAssigned", {
                            name: result.displayName ?? result.neighborhoodId,
                        }),
                    );
                } else if (result.status === "pending") {
                    toast.info(t("pages.account.addressPending"));
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
                    {/* key remounts AddressForm (and its address state) whenever
                        the stored address changes, providing the same prefill
                        reset as the old uncontrolled key+defaultValue pattern. */}
                    <AddressForm
                        key={location?.address ?? "empty"}
                        initialAddress={location?.address ?? ""}
                        isPending={submitAddress.isPending}
                        onSubmit={handleSubmit}
                        t={t}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
