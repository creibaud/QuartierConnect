import { useTranslation } from "react-i18next";
import { useAuthedFileUrl } from "../hooks/use-authed-file-url";

export function AuthedAudio({ fileId }: { fileId: string }) {
    const { t } = useTranslation();
    const url = useAuthedFileUrl(fileId);

    if (!url) {
        return (
            <div className="text-muted-foreground w-60 py-2 text-center text-xs">
                {t("common.loading")}
            </div>
        );
    }

    return (
        <audio
            controls
            preload="metadata"
            src={url}
            aria-label={t("messaging.voiceMessage")}
            className="h-10 w-60 max-w-full"
        />
    );
}
