import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import type { ServiceResponder } from "@workspace/shared/lib/types";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";
import { useContact } from "../hooks/services-core.hooks";

interface ResponderRowProps {
    responder: ServiceResponder;
}

export function ResponderRow({ responder }: ResponderRowProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const contact = useContact();

    const displayName =
        responder.firstName ?? t("pages.services.mine.unknownUser");
    const initials = displayName.charAt(0).toUpperCase();
    const date = new Date(responder.createdAt).toLocaleDateString("fr-FR");

    async function handleContact() {
        try {
            const { id } = await contact.mutateAsync(responder.userId);
            void navigate({ to: "/messages", search: { conversation: id } });
        } catch {
            toast.error(t("pages.services.mine.contactError"));
        }
    }

    return (
        <div className="flex items-center gap-3 py-2">
            <Avatar size="sm">
                {responder.avatarUrl ? (
                    <AvatarImage src={responder.avatarUrl} alt={displayName} />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="text-muted-foreground text-xs">{date}</p>
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={contact.isPending}
                onClick={() => void handleContact()}
            >
                {t("pages.services.mine.contact")}
            </Button>
        </div>
    );
}
