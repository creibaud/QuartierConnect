import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
    apiGet,
    apiPost,
    ensureAuthenticated,
} from "@workspace/shared/lib/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { toast } from "sonner";

export const Route = createFileRoute("/community-votes/")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user)
            throw redirect({ to: "/login", search: { forbidden: false } });
        if (user.role !== "admin")
            throw redirect({ to: "/login", search: { forbidden: true } });
    },
    component: CommunityVotesPage,
});

type VoteType = "binary" | "single_choice" | "multiple_choice" | "weighted";
interface VoteOption {
    id: string;
    label: string;
}
interface CommunityVote {
    _id: string;
    title: string;
    voteType: VoteType;
    status: "open" | "closed";
    endsAt: string;
    casts: unknown[];
}

const VOTE_TYPE_LABELS: Record<VoteType, string> = {
    binary: "Binaire (Oui/Non)",
    single_choice: "Choix unique",
    multiple_choice: "Choix multiple",
    weighted: "Vote pondéré",
};

function CommunityVotesPage() {
    const [createOpen, setCreateOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data, isLoading, isError } = useQuery<CommunityVote[]>({
        queryKey: ["admin-community-votes"],
        queryFn: () => apiGet<CommunityVote[]>("/community-votes"),
    });

    const closeVote = useMutation({
        mutationFn: (id: string) => apiPost(`/community-votes/${id}/close`, {}),
        onSuccess: () => {
            toast.success("Vote fermé");
            void queryClient.invalidateQueries({
                queryKey: ["admin-community-votes"],
            });
        },
        onError: () => toast.error("Erreur"),
    });

    const votes = data ?? [];

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
            <div className="mx-auto max-w-5xl space-y-6">
                <header className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">
                            Votes communautaires
                        </h1>
                        <Link
                            to="/dashboard"
                            className="text-muted-foreground text-sm hover:underline"
                        >
                            ← Tableau de bord
                        </Link>
                    </div>
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                        Créer un vote
                    </Button>
                </header>

                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded" />
                        ))}
                    </div>
                ) : isError ? (
                    <p className="text-destructive text-sm">
                        Erreur de chargement.
                    </p>
                ) : votes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Aucun vote créé.
                    </p>
                ) : (
                    <div className="rounded-lg border bg-white dark:bg-zinc-900">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Titre</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Participants</TableHead>
                                    <TableHead>Fin</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {votes.map((vote) => (
                                    <TableRow key={vote._id}>
                                        <TableCell className="font-medium">
                                            {vote.title}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {VOTE_TYPE_LABELS[vote.voteType]}
                                        </TableCell>
                                        <TableCell>
                                            {vote.casts.length}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {new Date(
                                                vote.endsAt,
                                            ).toLocaleDateString("fr-FR")}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    vote.status === "open"
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {vote.status === "open"
                                                    ? "En cours"
                                                    : "Fermé"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {vote.status === "open" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    disabled={
                                                        closeVote.isPending
                                                    }
                                                    onClick={() =>
                                                        closeVote.mutate(
                                                            vote._id,
                                                        )
                                                    }
                                                >
                                                    Fermer
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <CreateVoteDialog
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    onSuccess={() => {
                        setCreateOpen(false);
                        void queryClient.invalidateQueries({
                            queryKey: ["admin-community-votes"],
                        });
                    }}
                />
            </div>
        </div>
    );
}

function CreateVoteDialog({
    open,
    onOpenChange,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [voteType, setVoteType] = useState<VoteType>("binary");
    const [endsAt, setEndsAt] = useState("");
    const [options, setOptions] = useState<VoteOption[]>([
        { id: "yes", label: "Oui" },
        { id: "no", label: "Non" },
    ]);

    const create = useMutation({
        mutationFn: (payload: unknown) => apiPost("/community-votes", payload),
        onSuccess: () => {
            toast.success("Vote créé");
            onSuccess();
        },
        onError: (err: Error) => toast.error(err.message ?? "Erreur"),
    });

    function handleVoteTypeChange(type: VoteType) {
        setVoteType(type);
        if (type === "binary") {
            setOptions([
                { id: "yes", label: "Oui" },
                { id: "no", label: "Non" },
            ]);
        } else if (options.length < 2) {
            setOptions([
                { id: "opt1", label: "" },
                { id: "opt2", label: "" },
            ]);
        }
    }

    function addOption() {
        setOptions((prev) => [...prev, { id: `opt${Date.now()}`, label: "" }]);
    }

    function updateOption(index: number, label: string) {
        setOptions((prev) =>
            prev.map((o, i) => (i === index ? { ...o, label } : o)),
        );
    }

    function removeOption(index: number) {
        if (options.length <= 2) return;
        setOptions((prev) => prev.filter((_, i) => i !== index));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !endsAt) return;
        create.mutate({
            title: title.trim(),
            description: description.trim() || undefined,
            voteType,
            options: options.filter((o) => o.label.trim()),
            endsAt: new Date(endsAt).toISOString(),
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Créer un vote communautaire</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Titre *</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Question du vote"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Contexte optionnel"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Type de vote *</Label>
                        <Select
                            value={voteType}
                            onValueChange={(v) =>
                                handleVoteTypeChange(v as VoteType)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(
                                    Object.entries(VOTE_TYPE_LABELS) as [
                                        VoteType,
                                        string,
                                    ][]
                                ).map(([val, label]) => (
                                    <SelectItem key={val} value={val}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Options *</Label>
                            {voteType !== "binary" && (
                                <button
                                    type="button"
                                    className="text-primary text-xs hover:underline"
                                    onClick={addOption}
                                >
                                    + Ajouter
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {options.map((opt, i) => (
                                <div key={opt.id} className="flex gap-2">
                                    <Input
                                        value={opt.label}
                                        onChange={(e) =>
                                            updateOption(i, e.target.value)
                                        }
                                        placeholder={`Option ${i + 1}`}
                                        disabled={voteType === "binary"}
                                        required
                                    />
                                    {voteType !== "binary" &&
                                        options.length > 2 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeOption(i)}
                                            >
                                                ×
                                            </Button>
                                        )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Date de fin *</Label>
                        <Input
                            type="datetime-local"
                            value={endsAt}
                            onChange={(e) => setEndsAt(e.target.value)}
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
                        <Button type="submit" disabled={create.isPending}>
                            {create.isPending ? "Création…" : "Créer"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
