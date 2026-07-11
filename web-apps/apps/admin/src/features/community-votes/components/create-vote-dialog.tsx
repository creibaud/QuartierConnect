import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Spinner } from "@workspace/ui/components/spinner";
import { toast } from "sonner";
import { useCreateCommunityVote } from "../hooks/community-votes.hooks";
import type { VoteOption, VoteType } from "../lib/community-vote.types";
import { VOTE_TYPES, voteTypeLabel } from "../lib/vote-type-label";

export function CreateVoteDialog({
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
    const [description, setDescription] = useState("");
    const [voteType, setVoteType] = useState<VoteType>("binary");
    const [endsAt, setEndsAt] = useState("");
    const [options, setOptions] = useState<VoteOption[]>([
        { id: "yes", label: t("adminPages.communityVotes.optionYes") },
        { id: "no", label: t("adminPages.communityVotes.optionNo") },
    ]);

    const create = useCreateCommunityVote();

    function handleVoteTypeChange(type: VoteType) {
        setVoteType(type);
        if (type === "binary") {
            setOptions([
                { id: "yes", label: t("adminPages.communityVotes.optionYes") },
                { id: "no", label: t("adminPages.communityVotes.optionNo") },
            ]);
        } else if (options.length < 2) {
            setOptions([
                { id: "opt1", label: "" },
                { id: "opt2", label: "" },
            ]);
        }
    }

    function addOption() {
        setOptions((prev) => [...prev, { id: `opt${Date.now()}`, label: "" }]);
    }

    function updateOption(index: number, label: string) {
        setOptions((prev) =>
            prev.map((o, i) => (i === index ? { ...o, label } : o)),
        );
    }

    function removeOption(index: number) {
        if (options.length <= 2) return;
        setOptions((prev) => prev.filter((_, i) => i !== index));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !endsAt) return;
        create.mutate(
            {
                title: title.trim(),
                description: description.trim() || undefined,
                voteType,
                options: options.filter((o) => o.label.trim()),
                endsAt: new Date(endsAt).toISOString(),
            },
            {
                onSuccess: () => {
                    toast.success(t("adminPages.communityVotes.created"));
                    onSuccess();
                },
                onError: (err: Error) =>
                    toast.error(err.message ?? t("common.error")),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {t("adminPages.communityVotes.createTitle")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("adminPages.communityVotes.description")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="vote-title">
                            {t("adminPages.communityVotes.titleLabel")}
                        </Label>
                        <Input
                            id="vote-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t(
                                "adminPages.communityVotes.titlePlaceholder",
                            )}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="vote-description">
                            {t("incidents.fields.description")}
                        </Label>
                        <Input
                            id="vote-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t(
                                "adminPages.communityVotes.descriptionPlaceholder",
                            )}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="vote-type">
                            {t("adminPages.communityVotes.voteTypeLabel")}
                        </Label>
                        <Select
                            value={voteType}
                            onValueChange={(v) =>
                                handleVoteTypeChange(v as VoteType)
                            }
                        >
                            <SelectTrigger id="vote-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {VOTE_TYPES.map((val) => (
                                    <SelectItem key={val} value={val}>
                                        {voteTypeLabel(t, val)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label id="vote-options-label">
                                {t("adminPages.communityVotes.optionsLabel")}
                            </Label>
                            {voteType !== "binary" && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={addOption}
                                >
                                    <HugeiconsIcon icon={Add01Icon} />
                                    {t("adminPages.common.add")}
                                </Button>
                            )}
                        </div>
                        <div
                            role="group"
                            aria-labelledby="vote-options-label"
                            className="space-y-2"
                        >
                            {options.map((opt, i) => {
                                const optionLabel = t(
                                    "adminPages.communityVotes.optionPlaceholder",
                                    { number: i + 1 },
                                );
                                return (
                                    <div key={opt.id} className="flex gap-2">
                                        <Input
                                            value={opt.label}
                                            onChange={(e) =>
                                                updateOption(i, e.target.value)
                                            }
                                            placeholder={optionLabel}
                                            aria-label={optionLabel}
                                            disabled={voteType === "binary"}
                                            required
                                        />
                                        {voteType !== "binary" &&
                                            options.length > 2 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={t(
                                                        "adminPages.communityVotes.removeOption",
                                                    )}
                                                    onClick={() =>
                                                        removeOption(i)
                                                    }
                                                >
                                                    <HugeiconsIcon
                                                        icon={Cancel01Icon}
                                                    />
                                                </Button>
                                            )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="vote-ends-at">
                            {t("adminPages.communityVotes.endDateLabel")}
                        </Label>
                        <Input
                            id="vote-ends-at"
                            type="datetime-local"
                            value={endsAt}
                            onChange={(e) => setEndsAt(e.target.value)}
                            required
                        />
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
                                create.isPending || !title.trim() || !endsAt
                            }
                        >
                            {create.isPending ? (
                                <Spinner className="mr-2" />
                            ) : null}
                            {t("adminPages.common.create")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
