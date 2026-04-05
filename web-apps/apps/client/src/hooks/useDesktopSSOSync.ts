import { useEffect } from "react";
import { useAuth } from "@workspace/auth/context";
import { desktopSyncService } from "@workspace/auth/services/desktop-sync.service";

export const useDesktopSSOSync = () => {
    const { user, accessToken } = useAuth();

    useEffect(() => {
        const syncSession = async () => {
            try {
                const desktopSession =
                    await desktopSyncService.getDesktopSession();

                if (desktopSession?.accessToken && !user) {
                    console.log("📱 Auto-login from desktop session");

                    localStorage.setItem(
                        "accessToken",
                        desktopSession.accessToken,
                    );
                    if (desktopSession.refreshToken) {
                        localStorage.setItem(
                            "refreshToken",
                            desktopSession.refreshToken,
                        );
                    }

                    window.location.reload();
                }
            } catch (error) {}
        };

        syncSession();
        const interval = setInterval(syncSession, 10000);

        return () => clearInterval(interval);
    }, [user, accessToken]);
};
