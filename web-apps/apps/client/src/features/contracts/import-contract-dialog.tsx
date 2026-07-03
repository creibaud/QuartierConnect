import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cancel01Icon, Pdf01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { getCurrentUser, type TokenPayload } from "@workspace/shared/lib/auth";
import { useImportContract } from "@workspace/shared/lib/hooks/useContracts";
import type { Contract, SignatureZone } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { toast } from "sonner";
import { PdfZoneEditor, type ZoneSigner } from "./pdf-zone-editor";
import { type Neighbor, SignatoryPicker } from "./signatory-picker";
import {
    signersMissingZones,
    signerZoneColor,
} from "./signature-zone-utils";

type ImportStep = "upload" | "placement";
type FileErrorKey = "fileNotPdf" | "fileTooLarge";

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_SIGNATORIES = 4;

function validatePdfFile(file: File): FileErrorKey | null {
    const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return "fileNotPdf";
    if (file.size > MAX_PDF_BYTES) return "fileTooLarge";
    return null;
}

function selfAsNeighbor(user: TokenPayload | null): Neighbor[] {
    if (!user) return [];
    const fullName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" ");
    return [{ id: user.sub, name: fullName || user.email }];
}

export function ImportContractDialog({
    open,
    onOpenChange,
    onImported,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImported: (contract: Contract) => void;
}) {
    const { t } = useTranslation();
    const user = getCurrentUser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<ImportStep>("upload");
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<FileErrorKey | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [title, setTitle] = useState("");
    const [signatories, setSignatories] = useState<Neighbor[]>(() =>
        selfAsNeighbor(user),
    );
    const [zones, setZones] = useState<SignatureZone[]>([]);
    const importContract = useImportContract();

    const signers: ZoneSigner[] = signatories.map((signatory, index) => ({
        id: signatory.id,
        name: signatory.name,
        color: signerZoneColor(index),
    }));
    const missingSignerIds = signersMissingZones(
        signatories.map((s) => s.id),
        zones,
    );
    const missingSignerNames = signatories
        .filter((s) => missingSignerIds.includes(s.id))
        .map((s) => s.name);

    const canContinue = !!file && title.trim().length > 0;

    function acceptFile(candidate: File) {
        const error = validatePdfFile(candidate);
        setFileError(error);
        setFile(error ? null : candidate);
        setZones([]);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) acceptFile(dropped);
    }

    function handleSignatoriesChange(next: Neighbor[]) {
        setSignatories(next);
        setZones((current) =>
            current.filter((zone) =>
                next.some((s) => s.id === zone.signerId),
            ),
        );
    }

    function resetState() {
        setStep("upload");
        setFile(null);
        setFileError(null);
        setTitle("");
        setSignatories(selfAsNeighbor(user));
        setZones([]);
    }

    function handleSubmit() {
        if (!file || missingSignerIds.length > 0) return;
        importContract.mutate(
            {
                file,
                title: title.trim(),
                signatories: signatories.map((s) => s.id),
                zones,
            },
            {
                onSuccess: (contract) => {
                    toast.success(t("pages.contracts.import.success"));
                    resetState();
                    onImported(contract);
                },
                onError: () =>
                    toast.error(t("pages.contracts.import.error")),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        {t("pages.contracts.import.title")}
                    </DialogTitle>
                    <DialogDescription>
                        {t(`pages.contracts.import.step.${step}`)}
                    </DialogDescription>
                </DialogHeader>

                {step === "upload" && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>
                                {t("pages.contracts.import.fileLabel")}
                            </Label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf"
                                className="sr-only"
                                onChange={(e) => {
                                    const picked = e.target.files?.[0];
                                    if (picked) acceptFile(picked);
                                    e.target.value = "";
                                }}
                            />
                            {file ? (
                                <div className="flex items-center gap-3 rounded-lg border p-3">
                                    <HugeiconsIcon
                                        icon={Pdf01Icon}
                                        className="text-muted-foreground size-6 shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">
                                            {file.name}
                                        </p>
                                        <p className="text-muted-foreground text-xs">
                                            {t(
                                                "pages.contracts.import.fileSize",
                                                {
                                                    size: (
                                                        file.size /
                                                        (1024 * 1024)
                                                    ).toFixed(1),
                                                },
                                            )}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={t(
                                            "pages.contracts.import.removeFile",
                                        )}
                                        onClick={() => {
                                            setFile(null);
                                            setZones([]);
                                        }}
                                    >
                                        <HugeiconsIcon icon={Cancel01Icon} />
                                    </Button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className={`flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                                        dragOver
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:bg-muted/50"
                                    }`}
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragOver(true);
                                    }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                >
                                    <HugeiconsIcon
                                        icon={Pdf01Icon}
                                        className="text-muted-foreground size-8"
                                    />
                                    <span className="text-sm font-medium">
                                        {t("pages.contracts.import.dropLabel")}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                        {t("pages.contracts.import.dropHint")}
                                    </span>
                                </button>
                            )}
                            {fileError && (
                                <p className="text-destructive text-sm">
                                    {t(
                                        `pages.contracts.import.${fileError}`,
                                    )}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="import-title">
                                {t("pages.contracts.titleRequired")}
                            </Label>
                            <Input
                                id="import-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={t(
                                    "pages.contracts.import.titlePlaceholder",
                                )}
                                maxLength={255}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="import-signatory-search">
                                {t("pages.contracts.signatoriesLabel")}
                            </Label>
                            <SignatoryPicker
                                inputId="import-signatory-search"
                                selected={signatories}
                                onChange={handleSignatoriesChange}
                                enabled={open}
                                lockedIds={user ? [user.sub] : []}
                                maxSelected={MAX_SIGNATORIES}
                            />
                            <p className="text-muted-foreground text-xs">
                                {t("pages.contracts.import.signatoriesHint")}
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
                                type="button"
                                disabled={!canContinue}
                                onClick={() => setStep("placement")}
                            >
                                {t("common.continue")}
                            </Button>
                        </div>
                    </div>
                )}

                {step === "placement" && file && (
                    <div className="space-y-4">
                        <PdfZoneEditor
                            file={file}
                            signers={signers}
                            zones={zones}
                            onZonesChange={setZones}
                        />
                        {missingSignerNames.length > 0 ? (
                            <p className="text-destructive text-sm">
                                {t("pages.contracts.import.missingZones", {
                                    names: missingSignerNames.join(", "),
                                })}
                            </p>
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                {t("pages.contracts.import.zonesReady")}
                            </p>
                        )}
                        <div className="flex justify-between gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep("upload")}
                            >
                                {t("common.back")}
                            </Button>
                            <Button
                                type="button"
                                disabled={
                                    missingSignerIds.length > 0 ||
                                    importContract.isPending
                                }
                                onClick={handleSubmit}
                            >
                                {importContract.isPending
                                    ? t("pages.contracts.import.submitting")
                                    : t("pages.contracts.import.submit")}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
