import { useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Add01Icon,
    Agreement01Icon,
    Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { apiGet } from "@workspace/shared/lib/api";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import {
    useContracts,
    useCreateContract,
    useSignContract,
} from "@workspace/shared/lib/hooks/useContracts";
import type { Contract } from "@workspace/shared/lib/types";
import {
    Avatar,
    AvatarFallback,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@workspace/ui/components/command";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemTitle,
} from "@workspace/ui/components/item";
import { Label } from "@workspace/ui/components/label";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Spinner } from "@workspace/ui/components/spinner";
import {
    StatusBadge,
    statusTone,
} from "@workspace/ui/components/status-badge";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/contracts/")({
    component: ContractsPage,
});

interface Neighbor {
    id: string;
    name: string;
}

function useNeighborSearch(search: string, enabled: boolean) {
    const term = search.trim();
    return useQuery<Neighbor[]>({
        queryKey: ["users", "neighbors", term],
        queryFn: () =>
            apiGet<Neighbor[]>(
                `/users/neighbors?search=${encodeURIComponent(term)}`,
            ),
        enabled,
        staleTime: 30_000,
        placeholderData: keepPreviousData,
    });
}

function neighborInitials(name: string): string {
    return name
        .split(/\s+/)
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function ContractsPage() {
    const { t, i18n } = useTranslation();
    const user = getCurrentUser();
    const [createOpen, setCreateOpen] = useState(false);
    const [signTarget, setSignTarget] = useState<Contract | null>(null);
    const statusLabels: Record<string, string> = {
        draft: t("contracts.status.draft"),
        partial: t("contracts.status.partial"),
        fully_signed: t("contracts.status.fully_signed"),
        cancelled: t("contracts.status.cancelled"),
    };

    const { data, isLoading, isError, refetch } = useContracts();
    const contracts = data ?? [];

    const canSign = (contract: Contract) =>
        user &&
        contract.signatories.includes(user.sub) &&
        !contract.signatures.some((s) => s.userId === user.sub) &&
        contract.status !== "fully_signed" &&
        contract.status !== "cancelled";

    const contractMeta = (contract: Contract): string =>
        [
            t("pages.contracts.signatureCount", {
                signed: contract.signatures.length,
                total: contract.signatories.length,
                count: contract.signatories.length,
            }),
            contract.signedAt
                ? t("pages.contracts.signedOnDate", {
                      date: new Date(contract.signedAt).toLocaleDateString(
                          i18n.language,
                      ),
                  })
                : "",
        ]
            .filter(Boolean)
            .join(" · ");

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <PageHeader
                    title={t("contracts.title")}
                    description={t("pages.contracts.description")}
                    actions={
                        <Button onClick={() => setCreateOpen(true)}>
                            <HugeiconsIcon icon={Add01Icon} />
                            {t("pages.contracts.create")}
                        </Button>
                    }
                />

                <DataState
                    loading={isLoading}
                    error={isError ? true : undefined}
                    isEmpty={contracts.length === 0}
                    onRetry={() => void refetch()}
                    skeleton={
                        <div className="flex flex-col gap-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-28 w-full rounded-xl"
                                />
                            ))}
                        </div>
                    }
                    empty={
                        <Empty className="border">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <HugeiconsIcon icon={Agreement01Icon} />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {t("pages.contracts.emptyTitle")}
                                </EmptyTitle>
                                <EmptyDescription>
                                    {t("pages.contracts.emptyDescription")}
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button onClick={() => setCreateOpen(true)}>
                                    <HugeiconsIcon icon={Add01Icon} />
                                    {t("pages.contracts.create")}
                                </Button>
                            </EmptyContent>
                        </Empty>
                    }
                >
                    <ItemGroup className="gap-3">
                        {contracts.map((contract) => (
                            <Item key={contract._id} variant="outline">
                                <ItemContent>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <ItemTitle>
                                            <Link
                                                to="/contracts/$id"
                                                params={{ id: contract._id }}
                                                className="hover:underline"
                                            >
                                                {contract.title}
                                            </Link>
                                        </ItemTitle>
                                        <StatusBadge
                                            tone={statusTone(contract.status)}
                                            className="shrink-0"
                                        >
                                            {statusLabels[contract.status] ??
                                                contract.status}
                                        </StatusBadge>
                                    </div>
                                    <ItemDescription>
                                        {contractMeta(contract)}
                                    </ItemDescription>
                                    <p className="text-muted-foreground line-clamp-2 text-sm">
                                        {contract.content}
                                    </p>
                                </ItemContent>
                                {canSign(contract) && (
                                    <ItemActions>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                setSignTarget(contract)
                                            }
                                        >
                                            {t("pages.contracts.signWithTotp")}
                                        </Button>
                                    </ItemActions>
                                )}
                            </Item>
                        ))}
                    </ItemGroup>
                </DataState>

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
    const { t } = useTranslation();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [signatories, setSignatories] = useState<Neighbor[]>([]);
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const createContract = useCreateContract();
    const {
        data: neighbors,
        isLoading: neighborsLoading,
        isError: neighborsError,
    } = useNeighborSearch(deferredSearch, open);

    const isSelected = (id: string) =>
        signatories.some((neighbor) => neighbor.id === id);

    function toggleSignatory(neighbor: Neighbor) {
        setSignatories((current) =>
            current.some((s) => s.id === neighbor.id)
                ? current.filter((s) => s.id !== neighbor.id)
                : [...current, neighbor],
        );
    }

    function removeSignatory(id: string) {
        setSignatories((current) => current.filter((s) => s.id !== id));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        const signatoryIds = signatories.map((neighbor) => neighbor.id);
        createContract.mutate(
            {
                title: title.trim(),
                content: content.trim(),
                signatories:
                    signatoryIds.length > 0 ? signatoryIds : undefined,
            },
            {
                onSuccess: () => {
                    toast.success(t("pages.contracts.createSuccess"));
                    setTitle("");
                    setContent("");
                    setSignatories([]);
                    setSearch("");
                    onSuccess();
                },
                onError: () => toast.error(t("pages.contracts.createError")),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        {t("pages.contracts.create")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("pages.contracts.hashNotice")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="ct-title">
                            {t("pages.contracts.titleRequired")}
                        </Label>
                        <Input
                            id="ct-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t("pages.contracts.titlePlaceholder")}
                            maxLength={255}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ct-content">
                            {t("pages.contracts.contentRequired")}
                        </Label>
                        <Textarea
                            id="ct-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={t(
                                "pages.contracts.contentPlaceholder",
                            )}
                            rows={5}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ct-signatory-search">
                            {t("pages.contracts.signatoriesLabel")}
                        </Label>
                        {signatories.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {signatories.map((neighbor) => (
                                    <Badge
                                        key={neighbor.id}
                                        variant="secondary"
                                        className="gap-1 pr-1"
                                    >
                                        {neighbor.name}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeSignatory(neighbor.id)
                                            }
                                            aria-label={t(
                                                "pages.contracts.removeSignatory",
                                                { name: neighbor.name },
                                            )}
                                            className="hover:bg-foreground/10 rounded-sm p-0.5"
                                        >
                                            <HugeiconsIcon
                                                icon={Cancel01Icon}
                                                className="size-3"
                                            />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                        <Command
                            shouldFilter={false}
                            className="rounded-lg border"
                        >
                            <CommandInput
                                id="ct-signatory-search"
                                value={search}
                                onValueChange={setSearch}
                                placeholder={t(
                                    "pages.contracts.searchNeighborsPlaceholder",
                                )}
                            />
                            <CommandList className="max-h-40">
                                {neighborsLoading ? (
                                    <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-sm">
                                        <Spinner className="size-4" />
                                        {t("pages.contracts.neighborsLoading")}
                                    </div>
                                ) : neighborsError ? (
                                    <div className="text-destructive py-4 text-center text-sm">
                                        {t("pages.contracts.neighborsError")}
                                    </div>
                                ) : (
                                    <>
                                        <CommandEmpty>
                                            {t(
                                                "pages.contracts.neighborsEmpty",
                                            )}
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {(neighbors ?? []).map(
                                                (neighbor) => (
                                                    <CommandItem
                                                        key={neighbor.id}
                                                        value={neighbor.id}
                                                        data-checked={isSelected(
                                                            neighbor.id,
                                                        )}
                                                        onSelect={() =>
                                                            toggleSignatory(
                                                                neighbor,
                                                            )
                                                        }
                                                    >
                                                        <Avatar className="size-6">
                                                            <AvatarFallback className="text-[10px]">
                                                                {neighborInitials(
                                                                    neighbor.name,
                                                                )}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        {neighbor.name}
                                                    </CommandItem>
                                                ),
                                            )}
                                        </CommandGroup>
                                    </>
                                )}
                            </CommandList>
                        </Command>
                        <p className="text-muted-foreground text-xs">
                            {t("pages.contracts.signatoriesHint")}
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                createContract.isPending ||
                                !title.trim() ||
                                !content.trim()
                            }
                        >
                            {createContract.isPending
                                ? t("common.creating")
                                : t("common.create")}
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
    const { t } = useTranslation();
    const [totpCode, setTotpCode] = useState("");
    const signContract = useSignContract();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (totpCode.length !== 6) return;
        signContract.mutate(
            { id: contract._id, totpCode },
            {
                onSuccess: () => {
                    toast.success(t("pages.contracts.signSuccess"));
                    onSuccess();
                },
                onError: () => toast.error(t("pages.contracts.signError")),
            },
        );
    }

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        {t("contracts.signDialog.title")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("pages.contracts.signDescription", {
                            title: contract.title,
                        })}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-muted text-muted-foreground line-clamp-4 rounded-md p-3 font-mono text-xs">
                        {contract.content}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sign-totp">
                            {t("pages.contracts.totpLabel")}
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
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                signContract.isPending || totpCode.length !== 6
                            }
                        >
                            {signContract.isPending
                                ? t("pages.contracts.signing")
                                : t("contracts.sign")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
