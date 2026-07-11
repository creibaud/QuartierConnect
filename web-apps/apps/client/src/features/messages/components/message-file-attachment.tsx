import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { apiBlob } from "@workspace/shared/lib/api";
import type { Message } from "@workspace/shared/lib/types";
import {
    Attachment,
    AttachmentContent,
    AttachmentDescription,
    AttachmentMedia,
    AttachmentTitle,
} from "@workspace/ui/components/attachment";
import { toast } from "sonner";

export function MessageFileAttachment({ message }: { message: Message }) {
    const { t } = useTranslation();
    const [downloading, setDownloading] = useState(false);

    async function handleDownload() {
        if (!message.fileId) return;
        setDownloading(true);
        try {
            const blob = await apiBlob(`/messaging/files/${message.fileId}`);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = message.fileName ?? "file";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            toast.error(t("messaging.uploadError"));
        } finally {
            setDownloading(false);
        }
    }

    return (
        <Attachment size="sm">
            <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="flex min-w-0 items-center gap-2"
            >
                <AttachmentMedia variant="icon">
                    <HugeiconsIcon icon={Download01Icon} />
                </AttachmentMedia>
                <AttachmentContent>
                    <AttachmentTitle>
                        {message.fileName ?? t("messaging.download")}
                    </AttachmentTitle>
                    <AttachmentDescription>
                        {downloading
                            ? t("messaging.sending")
                            : t("messaging.download")}
                    </AttachmentDescription>
                </AttachmentContent>
            </button>
        </Attachment>
    );
}
