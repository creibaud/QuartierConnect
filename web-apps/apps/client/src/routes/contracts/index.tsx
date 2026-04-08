import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import {
    useContracts,
    useCreateContract,
    useSignContract,
} from "@workspace/shared/lib/hooks/useContracts";
import type { Contract } from "@workspace/shared/lib/types";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
    draft: "Brouillon",
    pending_signature: "En attente de signature",
    signed: "Signé",
    rejected: "Rejeté",
};

const STATUS_VARIANTS: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
> = {
    draft: "secondary",
    pending_signature: "default",
    signed: "outline",
    rejected: "destructive",
};

export const Route = createFileRoute("/contracts/")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user) throw redirect({ to: "/login" });
    },
    component: ContractsPage,
});

function ContractsPage() {
    const user = getCurrentUser();
    const [createOpen, setCreateOpen] = useState(false);
    const [signTarget, setSignTarget] = useState<Contract | null>(null);

    const { data, isLoading, isError } = useContracts();
    const contracts = data ?? [];

    const canSign = (contract: Contract) =>
        user &&
        contract.signatories.includes(user.sub) &&
        !contract.signatures.some((s) => s.userId === user.sub) &&
        contract.status !== "signed" &&
        contract.status !== "rejected";

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
            <div className="mx-auto max-w-2xl space-y-6">
                <header className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">Contrats</h1>
                        <Link
                            to="/dashboard"
                            className="text-muted-foreground text-sm hover:underline"
                        >
                            ← Tableau de bord
                        </Link>
                    </div>
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                        Créer un contrat
                    </Button>
                </header>

                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton
                                key={i}
                                className="h-24 w-full rounded-lg"
                            />
                        ))}
                    </div>
                ) : isError ? (
                    <p className="text-destructive text-sm">
                        Erreur de chargement. Réessayez.
                    </p>
                ) : contracts.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Aucun contrat pour le moment.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {contracts.map((contract) => (
                            <Card key={contract._id}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <CardTitle className="text-sm font-medium">
                                            {contract.title}
                                        </CardTitle>
                                        <Badge
                                            variant={
                                                STATUS_VARIANTS[
                                                    contract.status
                                                ] ?? "secondary"
                                            }
                                            className="shrink-0"
                                        >
                                            {STATUS_LABELS[contract.status] ??
                                                contract.status}
                                        </Badge>
                                    </div>
                                    <CardDescription>
                                        {contract.signatures.length}/
                                        {contract.signatories.length} signature
                                        {contract.signatories.length !== 1
                                            ? "s"
                                            : ""}
                                        {contract.signedAt && (
                                            <span className="ml-2">
                                                · signé le{" "}
                                                {new Date(
                                                    contract.signedAt,
                                                ).toLocaleDateString("fr-FR")}
                                            </span>
                                        )}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-0">
                                    <p className="text-muted-foreground line-clamp-2 text-sm">
                                        {contract.content}
                                    </p>
                                    {canSign(contract) && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                setSignTarget(contract)
                                            }
                                        >
                                            Signer avec TOTP
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <CreateContractDialog
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    onSuccess={() => setCreateOpen(false)}
                />

                {signTarget && (
                    <SignContractDialog
                        contract={signTarget}
                        onOpenChange={(open) => {
                            if (!open) setSignTarget(null);
                        }}
                        onSuccess={() => setSignTarget(null)}
                    />
                )}
            </div>
        </div>
    );
}

function CreateContractDialog({
    open,
    onOpenChange,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [signatoriesRaw, setSignatoriesRaw] = useState("");
    const createContract = useCreateContract();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        const signatories = signatoriesRaw
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        createContract.mutate(
            {
                title: title.trim(),
                content: content.trim(),
                signatories: signatories.length > 0 ? signatories : undefined,
            },
            {
                onSuccess: () => {
                    toast.success("Contrat créé");
                    setTitle("");
                    setContent("");
                    setSignatoriesRaw("");
                    onSuccess();
                },
                onError: () => toast.error("Impossible de créer le contrat"),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Créer un contrat</DialogTitle>
                    <DialogDescription>
                        Le contrat sera hashé (SHA-256) à la création.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="ct-title">Titre *</Label>
                        <Input
                            id="ct-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex : Contrat de prestation"
                            maxLength={255}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ct-content">Contenu *</Label>
                        <Textarea
                            id="ct-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Le prestataire s'engage à…"
                            rows={5}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ct-signatories">
                            Signataires (UUID, un par ligne)
                        </Label>
                        <Textarea
                            id="ct-signatories"
                            value={signatoriesRaw}
                            onChange={(e) => setSignatoriesRaw(e.target.value)}
                            placeholder={
                                "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\nyyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
                            }
                            rows={2}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                createContract.isPending ||
                                !title.trim() ||
                                !content.trim()
                            }
                        >
                            {createContract.isPending ? "Création…" : "Créer"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function SignContractDialog({
    contract,
    onOpenChange,
    onSuccess,
}: {
    contract: Contract;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const [totpCode, setTotpCode] = useState("");
    const signContract = useSignContract();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (totpCode.length !== 6) return;
        signContract.mutate(
            { id: contract._id, totpCode },
            {
                onSuccess: () => {
                    toast.success("Contrat signé");
                    onSuccess();
                },
                onError: () => toast.error("Code TOTP invalide ou déjà signé"),
            },
        );
    }

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Signer le contrat</DialogTitle>
                    <DialogDescription>
                        "{contract.title}" — saisissez votre code TOTP pour
                        apposer votre signature.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-muted text-muted-foreground line-clamp-4 rounded-md p-3 font-mono text-xs">
                        {contract.content}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sign-totp">
                            Code TOTP (6 chiffres) *
                        </Label>
                        <Input
                            id="sign-totp"
                            value={totpCode}
                            onChange={(e) =>
                                setTotpCode(
                                    e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 6),
                                )
                            }
                            placeholder="123456"
                            inputMode="numeric"
                            maxLength={6}
                            autoFocus
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                signContract.isPending || totpCode.length !== 6
                            }
                        >
                            {signContract.isPending ? "Signature…" : "Signer"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
