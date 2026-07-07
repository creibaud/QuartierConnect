import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiBlob } from "@workspace/shared/lib/api";
import { Skeleton } from "@workspace/ui/components/skeleton";

// Blob-backed iframe so the browser's native PDF viewer handles rendering.
export function ContractPdfViewer({ contractId }: { contractId: string }) {
    const { t } = useTranslation();
    const [url, setUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let objectUrl: string | null = null;
        let cancelled = false;
        // Reset to loading state when the contract changes.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset-on-change
        setUrl(null);
        setError(false);
        apiBlob(`/contracts/${contractId}/pdf`)
            .then((blob) => {
                if (cancelled) return;
                objectUrl = URL.createObjectURL(blob);
                setUrl(objectUrl);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            });
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [contractId]);

    if (error) {
        return (
            <div className="text-muted-foreground rounded-md border p-6 text-center text-sm">
                {t("pages.contractDetail.pdfError")}
            </div>
        );
    }

    if (!url) {
        return <Skeleton className="h-[78vh] w-full rounded-md" />;
    }

    return (
        <iframe
            src={`${url}#view=FitH`}
            title={t("pages.contractDetail.description")}
            className="h-[78vh] w-full rounded-md border"
        />
    );
}
