import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSignContract } from "@workspace/shared/lib/hooks/useContracts";
import type { Contract } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { useAppForm } from "@workspace/ui/lib/form";
import { toast } from "sonner";
import { z } from "zod";
import { SignaturePad } from "./signature-pad";

type Step = "read" | "draw" | "totp";

export function SignContractDialog({
    contract,
    onOpenChange,
    onSuccess,
}: {
    contract: Contract;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    const [step, setStep] = useState<Step>("read");
    const [signatureImage, setSignatureImage] = useState<string | null>(null);
    const signContract = useSignContract();

    const totpForm = useAppForm({
        defaultValues: { totpCode: "" },
        validators: {
            onSubmit: z.object({
                totpCode: z.string().length(6, t("auth.validation.totpLength")),
            }),
        },
        onSubmit: ({ value }) => {
            signContract.mutate(
                {
                    id: contract._id,
                    totpCode: value.totpCode,
                    signatureImage: signatureImage ?? undefined,
                },
                {
                    onSuccess: () => {
                        toast.success(t("pages.contracts.signSuccess"));
                        onSuccess();
                    },
                    onError: () => toast.error(t("pages.contracts.signError")),
                },
            );
        },
    });

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("contracts.signDialog.title")}</DialogTitle>
                    <DialogDescription>
                        {t(`contracts.signDialog.step.${step}`)}
                    </DialogDescription>
                </DialogHeader>

                {step === "read" && (
                    <div className="space-y-4">
                        <p className="text-sm">
                            {t("contracts.signDialog.readBody", {
                                points: contract.pointsAmount ?? 0,
                            })}
                        </p>
                        <div className="flex justify-end">
                            <Button onClick={() => setStep("draw")}>
                                {t("common.continue")}
                            </Button>
                        </div>
                    </div>
                )}

                {step === "draw" && (
                    <div className="space-y-4">
                        <SignaturePad
                            value={signatureImage}
                            onChange={setSignatureImage}
                            clearLabel={t("contracts.signDialog.clear")}
                        />
                        <div className="flex justify-between">
                            <Button
                                variant="outline"
                                onClick={() => setStep("read")}
                            >
                                {t("common.back")}
                            </Button>
                            <Button
                                onClick={() => setStep("totp")}
                                disabled={!signatureImage}
                            >
                                {t("common.continue")}
                            </Button>
                        </div>
                    </div>
                )}

                {step === "totp" && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            totpForm.handleSubmit();
                        }}
                        className="space-y-4"
                    >
                        <div className="flex flex-col items-center gap-2">
                            <totpForm.AppField name="totpCode">
                                {(field) => (
                                    <field.OtpField
                                        label={t("auth.totpCode")}
                                        autoFocus
                                        onComplete={() =>
                                            totpForm.handleSubmit()
                                        }
                                    />
                                )}
                            </totpForm.AppField>
                        </div>
                        <div className="flex justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep("draw")}
                            >
                                {t("common.back")}
                            </Button>
                            <Button
                                type="submit"
                                disabled={signContract.isPending}
                            >
                                {signContract.isPending
                                    ? t("pages.contracts.signing")
                                    : t("contracts.sign")}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
