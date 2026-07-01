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
import { ContractAuditTimeline } from "./contract-audit-timeline";
import { ContractPdfViewer } from "./contract-pdf-viewer";
import { SignContractDialog } from "./sign-contract-dialog";

export function ContractDetailPage({ id }: { id: string }) {
    const { t } = useTranslation();
    const { data: contract, isLoading, isError, refetch } = useContract(id);
    const [signOpen, setSignOpen] = useState(false);
    const currentUser = getCurrentUser();

    const canSign =
        !!contract &&
        !!currentUser &&
        contract.signatories.includes(currentUser.sub) &&
        !contract.signatures.some((s) => s.userId === currentUser.sub) &&
        contract.status !== "cancelled";

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6">
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
                                    <Badge>
                                        {t(`contracts.status.${contract.status}`)}
                                    </Badge>
                                    {canSign && (
                                        <Button onClick={() => setSignOpen(true)}>
                                            {t("contracts.sign")}
                                        </Button>
                                    )}
                                </div>
                            }
                        />
                        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
                            <ContractPdfViewer contractId={contract._id} />
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        {t("pages.contractDetail.auditTitle")}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ContractAuditTimeline
                                        contractId={contract._id}
                                    />
                                </CardContent>
                            </Card>
                        </div>
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
