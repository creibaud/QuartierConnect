import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateContract } from "@workspace/shared/lib/hooks/useContracts";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";
import { type Neighbor, SignatoryPicker } from "./signatory-picker";

export function CreateContractDialog({
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
