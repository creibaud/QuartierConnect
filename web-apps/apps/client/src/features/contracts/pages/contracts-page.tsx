import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Add01Icon,
    Agreement01Icon,
    FileImportIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { useContracts } from "@workspace/shared/lib/hooks/useContracts";
import type { Contract } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemTitle,
} from "@workspace/ui/components/item";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
    StatusBadge,
    statusTone,
} from "@workspace/ui/components/status-badge";
import { CreateContractDialog } from "../components/create-contract-dialog";
import { ImportContractDialog } from "../components/import-contract-dialog";
import { SignContractDialog } from "../components/sign-contract-dialog";
import {
    canSignContract,
    contractMeta,
    contractStatusLabels,
} from "../lib/contract-meta";

export function ContractsPage() {
    const { t, i18n } = useTranslation();
    const user = getCurrentUser();
    const navigate = useNavigate();
    const [createOpen, setCreateOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [signTarget, setSignTarget] = useState<Contract | null>(null);
    const statusLabels = contractStatusLabels(t);

    const { data, isLoading, isError, refetch } = useContracts();
    const contracts = data ?? [];

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
                                        {contractMeta(
                                            contract,
                                            t,
                                            i18n.language,
                                        )}
                                    </ItemDescription>
                                    <p className="text-muted-foreground line-clamp-2 text-sm">
                                        {contract.content}
                                    </p>
                                </ItemContent>
                                {canSignContract(contract, user?.sub) && (
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
