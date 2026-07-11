import { useEffect, useState } from "react";
import { apiBlobUrl } from "@workspace/shared/lib/api";

export function useAuthedFileUrl(fileId: string): string | null {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        let objectUrl: string | null = null;
        apiBlobUrl(`/messaging/files/${fileId}`)
            .then((created) => {
                if (cancelled) {
                    URL.revokeObjectURL(created);
                    return;
                }
                objectUrl = created;
                setUrl(created);
            })
            .catch(() => {
                // file failed to load — leave placeholder
            });
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [fileId]);

    return url;
}
