import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateConversation } from "@workspace/shared/lib/hooks/useMessaging";
import type { UserSearchResult } from "@workspace/shared/lib/hooks/useUserSearch";
import { Button } from "@workspace/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Label } from "@workspace/ui/components/label";
import { toast } from "sonner";
import { UserPicker } from "@/components/user-picker";

// Stable backend codes mapped to localized messages. USER_EMAIL_NOT_FOUND and
// SELF_CONVERSATION are unreachable from here: the picker sends an id the
// server itself returned, and the search already excludes the caller.
const ERROR_KEYS: Record<string, string> = {
    NO_OTHER_PARTICIPANTS: "pages.messages.participantsRequired",
    PARTICIPANTS_REQUIRED: "pages.messages.participantsRequired",
};

export function NewConversationDialog({
    open,
    onOpenChange,
    onCreated,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (id: string) => void;
}) {
    const { t } = useTranslation();
    const [neighbor, setNeighbor] = useState<UserSearchResult | null>(null);
    const create = useCreateConversation();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!neighbor) return;
        try {
            // The picker already resolved the id, so skip the email lookup.
            const conv = await create.mutateAsync({
                participants: [neighbor.id],
            });
            toast.success(t("pages.messages.conversationReady"));
            setNeighbor(null);
            onOpenChange(false);
            onCreated(conv._id);
        } catch (err) {
            const code = (err as { code?: string }).code;
            toast.error(
                t(
                    (code && ERROR_KEYS[code]) ??
                        "pages.messages.createConversationError",
                ),
            );
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("messaging.newConversation")}</DialogTitle>
                    <DialogDescription>
                        {t("pages.messages.newConversationDescription")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="conv-neighbor">
                            {t("pages.messages.neighborLabel")}
                        </Label>
                        <UserPicker
                            id="conv-neighbor"
                            selected={neighbor}
                            onSelect={setNeighbor}
                            placeholder={t(
                                "pages.messages.neighborPlaceholder",
                            )}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={create.isPending || !neighbor}
                        >
                            {create.isPending
                                ? t("common.creating")
                                : t("pages.messages.start")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
