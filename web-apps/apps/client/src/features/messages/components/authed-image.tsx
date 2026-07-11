import { useTranslation } from "react-i18next";
import { useAuthedFileUrl } from "../hooks/use-authed-file-url";

export function AuthedImage({ fileId, alt }: { fileId: string; alt: string }) {
    const { t } = useTranslation();
    const url = useAuthedFileUrl(fileId);

    if (!url) {
        return (
            <div className="text-muted-foreground py-6 text-center text-xs">
                {t("common.loading")}
            </div>
        );
    }

    return (
        <img
            src={url}
            alt={alt}
            className="max-h-64 max-w-full rounded-lg object-cover"
        />
    );
}
