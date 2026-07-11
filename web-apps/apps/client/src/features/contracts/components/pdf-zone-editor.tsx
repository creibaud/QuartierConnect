import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type {
    SignatureZone,
    SignatureZoneKind,
} from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Document, Page, pdfjs } from "react-pdf";
import { moveZone, placeZone, resizeZone } from "../lib/signature-zone-utils";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).toString();

const MAX_PAGE_WIDTH = 640;
const CONTAINER_PADDING = 32;

export interface ZoneSigner {
    id: string;
    name: string;
    color: string;
}

interface PaletteDrag {
    signerId: string;
    kind: SignatureZoneKind;
    clientX: number;
    clientY: number;
}

interface ZoneDrag {
    mode: "move" | "resize";
    index: number;
    startClientX: number;
    startClientY: number;
    overlayWidth: number;
    overlayHeight: number;
    origin: SignatureZone;
}

export function PdfZoneEditor({
    file,
    signers,
    zones,
    onZonesChange,
}: {
    file: File;
    signers: ZoneSigner[];
    zones: SignatureZone[];
    onZonesChange: (zones: SignatureZone[]) => void;
}) {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageReady, setPageReady] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [paletteDrag, setPaletteDrag] = useState<PaletteDrag | null>(null);
    const [zoneDrag, setZoneDrag] = useState<ZoneDrag | null>(null);
    const [loadedFile, setLoadedFile] = useState<File | null>(null);

    // Reset stale results when the file changes, before react-pdf reloads it
    // (see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
    if (loadedFile !== file) {
        setLoadedFile(file);
        setNumPages(0);
        setPageNumber(1);
        setPageReady(false);
        setLoadError(false);
    }

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const observer = new ResizeObserver(([entry]) => {
            setContainerWidth(entry.contentRect.width);
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    const signerById = new Map(signers.map((signer) => [signer.id, signer]));
    const kindLabels: Record<SignatureZoneKind, string> = {
        signature: t("pages.contracts.import.kind.signature"),
        initials: t("pages.contracts.import.kind.initials"),
    };

    const pageWidth = containerWidth
        ? Math.min(
              MAX_PAGE_WIDTH,
              Math.max(1, containerWidth - CONTAINER_PADDING),
          )
        : MAX_PAGE_WIDTH;

    function goToPage(page: number) {
        setPageReady(false);
        setPageNumber(page);
    }

    function handleChipPointerDown(
        e: React.PointerEvent<HTMLButtonElement>,
        signerId: string,
        kind: SignatureZoneKind,
    ) {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setPaletteDrag({ signerId, kind, clientX: e.clientX, clientY: e.clientY });
    }

    function handleChipPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
        setPaletteDrag((drag) =>
            drag ? { ...drag, clientX: e.clientX, clientY: e.clientY } : drag,
        );
    }

    function handleChipPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
        if (!paletteDrag) return;
        const overlay = overlayRef.current;
        if (overlay && pageReady) {
            const rect = overlay.getBoundingClientRect();
            const inside =
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom;
            if (inside && rect.width > 0 && rect.height > 0) {
                onZonesChange([
                    ...zones,
                    placeZone({
                        page: pageNumber,
                        signerId: paletteDrag.signerId,
                        kind: paletteDrag.kind,
                        centerX: (e.clientX - rect.left) / rect.width,
                        centerY: (e.clientY - rect.top) / rect.height,
                    }),
                ]);
            }
        }
        setPaletteDrag(null);
    }

    function startZoneDrag(
        e: React.PointerEvent<HTMLElement>,
        mode: ZoneDrag["mode"],
        index: number,
    ) {
        const overlay = overlayRef.current;
        if (!overlay) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        const rect = overlay.getBoundingClientRect();
        setZoneDrag({
            mode,
            index,
            startClientX: e.clientX,
            startClientY: e.clientY,
            overlayWidth: rect.width,
            overlayHeight: rect.height,
            origin: zones[index],
        });
    }

    function handleZonePointerMove(e: React.PointerEvent<HTMLElement>) {
        if (!zoneDrag) return;
        const dx = (e.clientX - zoneDrag.startClientX) / zoneDrag.overlayWidth;
        const dy = (e.clientY - zoneDrag.startClientY) / zoneDrag.overlayHeight;
        const updated =
            zoneDrag.mode === "move"
                ? moveZone(zoneDrag.origin, dx, dy)
                : resizeZone(
                      zoneDrag.origin,
                      zoneDrag.origin.w + dx,
                      zoneDrag.origin.h + dy,
                  );
        onZonesChange(
            zones.map((zone, i) => (i === zoneDrag.index ? updated : zone)),
        );
    }

    function removeZone(index: number) {
        onZonesChange(zones.filter((_, i) => i !== index));
    }

    if (loadError) {
        return (
            <div className="text-muted-foreground rounded-md border p-6 text-center text-sm">
                {t("pages.contracts.import.pdfPreviewError")}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex shrink-0 flex-col gap-3 lg:w-56">
                <p className="text-muted-foreground text-xs">
                    {t("pages.contracts.import.paletteHint")}
                </p>
                {signers.map((signer) => (
                    <div key={signer.id} className="space-y-1.5">
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                            <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: signer.color }}
                            />
                            <span className="truncate">{signer.name}</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {(
                                ["signature", "initials"] as const
                            ).map((kind) => (
                                <button
                                    key={kind}
                                    type="button"
                                    className="cursor-grab touch-none rounded-md border-2 px-2.5 py-1 text-xs font-medium select-none active:cursor-grabbing"
                                    style={{ borderColor: signer.color }}
                                    onPointerDown={(e) =>
                                        handleChipPointerDown(
                                            e,
                                            signer.id,
                                            kind,
                                        )
                                    }
                                    onPointerMove={handleChipPointerMove}
                                    onPointerUp={handleChipPointerUp}
                                >
                                    {kindLabels[kind]}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div ref={containerRef} className="min-w-0 flex-1">
                <div className="bg-muted/30 rounded-md border p-4">
                    <Document
                        file={file}
                        onLoadSuccess={({ numPages: total }) => {
                            setNumPages(total);
                            setPageNumber(1);
                        }}
                        onLoadError={() => setLoadError(true)}
                        loading={<Skeleton className="h-[480px] w-full" />}
                    >
                        <div className="relative mx-auto w-fit shadow">
                            {/* Text/annotation layers off so they don't intercept zone drags. */}
                            <Page
                                pageNumber={pageNumber}
                                width={pageWidth}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                onRenderSuccess={() => setPageReady(true)}
                            />
                            {pageReady && (
                                <div
                                    ref={overlayRef}
                                    className="absolute inset-0"
                                >
                                    {zones.map((zone, index) => {
                                        if (zone.page !== pageNumber)
                                            return null;
                                        const signer = signerById.get(
                                            zone.signerId,
                                        );
                                        const color =
                                            signer?.color ?? "var(--chart-1)";
                                        return (
                                            <div
                                                key={index}
                                                className="absolute cursor-move touch-none rounded-sm border-2 select-none"
                                                style={{
                                                    left: `${zone.x * 100}%`,
                                                    top: `${zone.y * 100}%`,
                                                    width: `${zone.w * 100}%`,
                                                    height: `${zone.h * 100}%`,
                                                    borderColor: color,
                                                    backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`,
                                                }}
                                                onPointerDown={(e) =>
                                                    startZoneDrag(
                                                        e,
                                                        "move",
                                                        index,
                                                    )
                                                }
                                                onPointerMove={
                                                    handleZonePointerMove
                                                }
                                                onPointerUp={() =>
                                                    setZoneDrag(null)
                                                }
                                            >
                                                <span className="pointer-events-none absolute inset-x-1 top-0.5 truncate text-[10px] leading-tight font-medium">
                                                    {kindLabels[zone.kind]}
                                                    {signer
                                                        ? ` · ${signer.name}`
                                                        : ""}
                                                </span>
                                                <button
                                                    type="button"
                                                    aria-label={t(
                                                        "pages.contracts.import.removeZone",
                                                    )}
                                                    className="bg-background text-foreground absolute -top-2.5 -right-2.5 flex size-5 items-center justify-center rounded-full border shadow-sm"
                                                    onPointerDown={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                    onClick={() =>
                                                        removeZone(index)
                                                    }
                                                >
                                                    <HugeiconsIcon
                                                        icon={Cancel01Icon}
                                                        className="size-3"
                                                    />
                                                </button>
                                                <span
                                                    role="presentation"
                                                    className="absolute -right-1 -bottom-1 size-3 cursor-se-resize touch-none rounded-sm border"
                                                    style={{
                                                        backgroundColor: color,
                                                    }}
                                                    onPointerDown={(e) =>
                                                        startZoneDrag(
                                                            e,
                                                            "resize",
                                                            index,
                                                        )
                                                    }
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </Document>
                </div>
                {numPages > 1 && (
                    <div className="mt-3 flex items-center justify-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            disabled={pageNumber <= 1}
                            aria-label={t("pages.contracts.import.prevPage")}
                            onClick={() => goToPage(pageNumber - 1)}
                        >
                            <HugeiconsIcon icon={ArrowLeft01Icon} />
                        </Button>
                        <span className="text-muted-foreground text-sm tabular-nums">
                            {t("pages.contracts.import.pageIndicator", {
                                current: pageNumber,
                                total: numPages,
                            })}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            disabled={pageNumber >= numPages}
                            aria-label={t("pages.contracts.import.nextPage")}
                            onClick={() => goToPage(pageNumber + 1)}
                        >
                            <HugeiconsIcon
                                icon={ArrowLeft01Icon}
                                className="rotate-180"
                            />
                        </Button>
                    </div>
                )}
            </div>

            {paletteDrag &&
                createPortal(
                    <div
                        className="bg-background pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-1/2 rounded-md border-2 px-2.5 py-1 text-xs font-medium shadow-md"
                        style={{
                            left: paletteDrag.clientX,
                            top: paletteDrag.clientY,
                            borderColor:
                                signerById.get(paletteDrag.signerId)?.color,
                        }}
                    >
                        {kindLabels[paletteDrag.kind]}
                    </div>,
                    document.body,
                )}
        </div>
    );
}
