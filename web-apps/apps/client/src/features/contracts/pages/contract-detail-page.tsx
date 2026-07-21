import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { useContract } from "@workspace/shared/lib/hooks/useContracts";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { DataState } from "@workspace/ui/components/data-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
    StatusBadge,
    statusTone,
} from "@workspace/ui/components/status-badge";
import { ContractAuditTimeline } from "../components/contract-audit-timeline";
import { ContractPdfViewer } from "../components/contract-pdf-viewer";
import { SignContractDialog } from "../components/sign-contract-dialog";
import { contractMeta } from "../lib/contract-meta";

export function ContractDetailPage({ id }: { id: string }) {
    const { t, i18n } = useTranslation();
    const { data: contract, isLoading, isError, refetch } = useContract(id);
    const [signOpen, setSignOpen] = useState(false);
    const currentUser = getCurrentUser();

    // Admins can open any contract but only its parties may see the document.
    const isParty =
        !!contract &&
        !!currentUser &&
        (contract.createdBy === currentUser.sub ||
            contract.signatories.includes(currentUser.sub));

    const canSign =
        isParty &&
        !!contract &&
        !!currentUser &&
        contract.signatories.includes(currentUser.sub) &&
        !contract.signatures.some((s) => s.userId === currentUser.sub) &&
        contract.status !== "cancelled";

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
            <DataState
                loading={isLoading}
                error={isError ? true : undefined}
                isEmpty={false}
                onRetry={() => void refetch()}
                skeleton={<Skeleton className="h-[600px] w-full rounded-xl" />}
            >
                {contract && (
                    <>
                        <PageHeader
                            title={contract.title}
                            description={t("pages.contractDetail.description")}
                            actions={
                                <div className="flex items-center gap-2">
                                    {contract.source === "imported" && (
                                        <Badge variant="outline">
                                            {t(
                                                "pages.contracts.importedBadge",
                                            )}
                                        </Badge>
                                    )}
                                    <StatusBadge
                                        tone={statusTone(contract.status)}
                                    >
                                        {t(`contracts.status.${contract.status}`)}
                                    </StatusBadge>
                                    {canSign && (
                                        <Button onClick={() => setSignOpen(true)}>
                                            {t("contracts.sign")}
                                        </Button>
                                    )}
                                </div>
                            }
                        />
                        {isParty ? (
                            <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
                                <ContractPdfViewer contractId={contract._id} />
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            {t(
                                                "pages.contractDetail.auditTitle",
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ContractAuditTimeline
                                            contractId={contract._id}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        {t(
                                            "pages.contractDetail.privateTitle",
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p className="text-muted-foreground text-sm">
                                        {contractMeta(
                                            contract,
                                            t,
                                            i18n.language,
                                        )}
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                        {t(
                                            "pages.contractDetail.privateNotice",
                                        )}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                        {signOpen && (
                            <SignContractDialog
                                contract={contract}
                                onOpenChange={setSignOpen}
                                onSuccess={() => {
                                    setSignOpen(false);
                                    void refetch();
                                }}
                            />
                        )}
                    </>
                )}
            </DataState>
        </div>
    );
}
