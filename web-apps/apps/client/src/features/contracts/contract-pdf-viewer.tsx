import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { apiBlob } from "@workspace/shared/lib/api";
import { Skeleton } from "@workspace/ui/components/skeleton";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).toString();

export function ContractPdfViewer({ contractId }: { contractId: string }) {
    const { t } = useTranslation();
    const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [error, setError] = useState(false);
    const [loadedContractId, setLoadedContractId] = useState<string | null>(
        null,
    );

    // Reset stale results when contractId changes, before the effect
    // fetches the new PDF (see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
    if (loadedContractId !== contractId) {
        setLoadedContractId(contractId);
        setBuffer(null);
        setError(false);
    }

    useEffect(() => {
        let cancelled = false;
        apiBlob(`/contracts/${contractId}/pdf`)
            .then((blob) => blob.arrayBuffer())
            .then((buf) => {
                if (!cancelled) setBuffer(buf);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            });
        return () => {
            cancelled = true;
        };
    }, [contractId]);

    // react-pdf detaches the buffer; give it a fresh copy each load.
    const file = useMemo(
        () => (buffer ? { data: buffer.slice(0) } : null),
        [buffer],
    );

    if (error) {
        return (
            <div className="text-muted-foreground rounded-md border p-6 text-center text-sm">
                {t("pages.contractDetail.pdfError")}
            </div>
        );
    }
    if (!file) {
        return <Skeleton className="h-[600px] w-full rounded-md" />;
    }

    return (
        <div className="bg-muted/30 overflow-auto rounded-md border p-4">
            <Document
                file={file}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                onLoadError={() => setError(true)}
                loading={<Skeleton className="h-[600px] w-full" />}
            >
                {Array.from({ length: numPages }).map((_, i) => (
                    <Page
                        key={i}
                        pageNumber={i + 1}
                        width={560}
                        className="mx-auto mb-4 shadow"
                    />
                ))}
            </Document>
        </div>
    );
}
