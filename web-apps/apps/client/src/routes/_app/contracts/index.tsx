import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Add01Icon,
    Agreement01Icon,
    FileImportIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import {
    useContracts,
    useCreateContract,
} from "@workspace/shared/lib/hooks/useContracts";
import type { Contract } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
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
import {
    StatusBadge,
    statusTone,
} from "@workspace/ui/components/status-badge";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";
import { ImportContractDialog } from "@/features/contracts/import-contract-dialog";
import { SignContractDialog } from "@/features/contracts/sign-contract-dialog";
import {
    type Neighbor,
    SignatoryPicker,
} from "@/features/contracts/signatory-picker";

export const Route = createFileRoute("/_app/contracts/")({
    component: ContractsPage,
});

function ContractsPage() {
    const { t, i18n } = useTranslation();
    const user = getCurrentUser();
    const navigate = useNavigate();
    const [createOpen, setCreateOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
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
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setImportOpen(true)}
                            >
                                <HugeiconsIcon icon={FileImportIcon} />
                                {t("pages.contracts.import.cta")}
                            </Button>
                            <Button onClick={() => setCreateOpen(true)}>
                                <HugeiconsIcon icon={Add01Icon} />
                                {t("pages.contracts.create")}
                            </Button>
                        </div>
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

                <ImportContractDialog
                    open={importOpen}
                    onOpenChange={setImportOpen}
                    onImported={(contract) => {
                        setImportOpen(false);
                        void navigate({
                            to: "/contracts/$id",
                            params: { id: contract._id },
                        });
                    }}
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
    const createContract = useCreateContract();

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
                        <SignatoryPicker
                            inputId="ct-signatory-search"
                            selected={signatories}
                            onChange={setSignatories}
                            enabled={open}
                        />
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
