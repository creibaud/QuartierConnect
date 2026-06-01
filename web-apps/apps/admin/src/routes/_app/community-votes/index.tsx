import { useState } from "react";
import { Add01Icon, Agreement01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
    apiGet,
    apiPost,
} from "@workspace/shared/lib/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/community-votes/")({
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

    const { data, isLoading, isError, refetch } = useQuery<CommunityVote[]>({
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
        <div className="p-6">
            <div className="mx-auto max-w-6xl space-y-6">
                <PageHeader
                    title="Votes communautaires"
                    description="Consultations et décisions du quartier"
                    actions={
                        <Button onClick={() => setCreateOpen(true)}>
                            <HugeiconsIcon icon={Add01Icon} />
                            Créer
                        </Button>
                    }
                />

                <DataState
                    loading={isLoading}
                    error={isError ? true : undefined}
                    isEmpty={votes.length === 0}
                    onRetry={() => void refetch()}
                    errorTitle="Impossible de charger les votes"
                    skeleton={
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-40 w-full rounded-lg"
                                />
                            ))}
                        </div>
                    }
                    empty={
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <HugeiconsIcon icon={Agreement01Icon} />
                                </EmptyMedia>
                                <EmptyTitle>Aucun vote</EmptyTitle>
                                <EmptyDescription>
                                    Lancez une consultation pour recueillir
                                    l'avis des habitants.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button onClick={() => setCreateOpen(true)}>
                                    <HugeiconsIcon icon={Add01Icon} />
                                    Créer
                                </Button>
                            </EmptyContent>
                        </Empty>
                    }
                >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {votes.map((vote) => (
                            <Card key={vote._id} className="flex flex-col">
                                <CardHeader className="gap-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-base">
                                            {vote.title}
                                        </CardTitle>
                                        <Badge
                                            variant={
                                                vote.status === "open"
                                                    ? "default"
                                                    : "outline"
                                            }
                                        >
                                            {vote.status === "open"
                                                ? "En cours"
                                                : "Fermé"}
                                        </Badge>
                                    </div>
                                    <p className="text-muted-foreground text-xs">
                                        {VOTE_TYPE_LABELS[vote.voteType]}
                                    </p>
                                </CardHeader>
                                <CardContent className="flex flex-1 flex-col justify-end gap-4">
                                    <dl className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="space-y-0.5">
                                            <dt className="text-muted-foreground text-xs">
                                                Participants
                                            </dt>
                                            <dd className="font-medium tabular-nums">
                                                {vote.casts.length}
                                            </dd>
                                        </div>
                                        <div className="space-y-0.5">
                                            <dt className="text-muted-foreground text-xs">
                                                Fin
                                            </dt>
                                            <dd className="font-medium tabular-nums">
                                                {new Date(
                                                    vote.endsAt,
                                                ).toLocaleDateString("fr-FR")}
                                            </dd>
                                        </div>
                                    </dl>
                                    {vote.status === "open" && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            disabled={closeVote.isPending}
                                            onClick={() =>
                                                closeVote.mutate(vote._id)
                                            }
                                        >
                                            Fermer le vote
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </DataState>

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
