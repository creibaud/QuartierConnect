import { useTranslation } from "react-i18next";
import { AvatarBadge } from "@workspace/ui/components/avatar";

export function PresenceBadge({ online }: { online: boolean }) {
    const { t } = useTranslation();

    if (!online) return null;

    return (
        <AvatarBadge
            role="status"
            aria-label={t("realtime.presence.online")}
            className="bg-emerald-500"
        />
    );
}
