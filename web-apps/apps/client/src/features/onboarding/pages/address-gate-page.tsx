import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Spinner } from "@workspace/ui/components/spinner";
import { AuthLayout } from "@/components/auth-layout";
import { useSubmitAddress } from "../hooks/address.hooks";

export function AddressGatePage() {
    const navigate = useNavigate();
    const [addressInput, setAddressInput] = useState("");
    const [confirmedName, setConfirmedName] = useState<string | null>(null);

    const { mutate: submitAddress, isPending } = useSubmitAddress();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        submitAddress(addressInput, {
            onSuccess: (result) => {
                if (result.status === "not_found") {
                    toast.error(
                        "Adresse introuvable. Vérifiez et réessayez.",
                    );
                    return;
                }
                setConfirmedName(result.displayName ?? addressInput);
                setTimeout(() => {
                    if (result.status === "assigned") {
                        void navigate({ to: "/" });
                    } else {
                        // Task 11 fills the pending screen content
                        void navigate({ to: "/onboarding/pending" });
                    }
                }, 1200);
            },
            onError: () => {
                toast.error("Une erreur est survenue. Réessayez.");
            },
        });
    }

    return (
        <AuthLayout subtitle="Rejoignez votre quartier en quelques secondes.">
            <Card className="border-border/60 shadow-foreground/5 shadow-lg">
                <CardContent className="space-y-4">
                    {confirmedName ? (
                        <div className="space-y-2 py-2 text-center text-sm">
                            <p className="text-muted-foreground">
                                Adresse reconnue :
                            </p>
                            <p className="text-foreground font-medium">
                                {confirmedName}
                            </p>
                            <Spinner className="mx-auto mt-2" />
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="address">Votre adresse</Label>
                                <Input
                                    id="address"
                                    type="text"
                                    placeholder="12 rue de Reuilly, 75012 Paris"
                                    value={addressInput}
                                    onChange={(e) =>
                                        setAddressInput(e.target.value)
                                    }
                                    required
                                    autoFocus
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isPending || !addressInput.trim()}
                            >
                                {isPending ? (
                                    <Spinner className="mr-2" />
                                ) : null}
                                Confirmer mon adresse
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </AuthLayout>
    );
}
