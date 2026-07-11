import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateConversation } from "@workspace/shared/lib/hooks/useMessaging";
import { Button } from "@workspace/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { toast } from "sonner";

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
    const [email, setEmail] = useState("");
    const create = useCreateConversation();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = email.trim().toLowerCase();
        if (!trimmed) return;
        try {
            const conv = await create.mutateAsync({
                participantEmails: [trimmed],
            });
            toast.success(t("pages.messages.conversationReady"));
            setEmail("");
            onOpenChange(false);
            onCreated(conv._id);
        } catch (err) {
            // Map stable backend codes to localized messages.
            const codeKeys: Record<string, string> = {
                USER_EMAIL_NOT_FOUND: "pages.messages.userEmailNotFound",
                SELF_CONVERSATION: "pages.messages.selfConversation",
                NO_OTHER_PARTICIPANTS: "pages.messages.participantsRequired",
                PARTICIPANTS_REQUIRED: "pages.messages.participantsRequired",
            };
            const code = (err as { code?: string }).code;
            toast.error(
                t(
                    (code && codeKeys[code]) ??
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
                        <Label htmlFor="conv-email">
                            {t("pages.messages.neighborEmail")}
                        </Label>
                        <Input
                            id="conv-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="bob@demo.fr"
                            autoComplete="off"
                            autoFocus
                            required
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
                            disabled={create.isPending || !email.trim()}
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
