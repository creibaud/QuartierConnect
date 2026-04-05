/// <reference types="vite/client" />
import type { AuthSession } from "../types";

const DESKTOP_SESSION_SERVER =
    import.meta.env.VITE_DESKTOP_SESSION_SERVER ?? "https://session.localhost";
const DESKTOP_SESSION_ENDPOINT = `${DESKTOP_SESSION_SERVER}/api/session`;

export const desktopSyncService = {
    async getDesktopSession(): Promise<AuthSession | null> {
        try {
            const response = await fetch(DESKTOP_SESSION_ENDPOINT, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                signal: AbortSignal.timeout(2000),
            });

            if (response.ok && response.status !== 204) {
                return (await response.json()) as AuthSession;
            }
            return null;
        } catch (error) {
            return null;
        }
    },

    async syncSessionToDesktop(session: AuthSession | null): Promise<void> {
        try {
            if (session === null) {
                await fetch(DESKTOP_SESSION_ENDPOINT, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    signal: AbortSignal.timeout(2000),
                });
                console.log("🗑️  Desktop session cleared");
            } else {
                await fetch(DESKTOP_SESSION_ENDPOINT, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(session),
                    signal: AbortSignal.timeout(2000),
                });
                console.log("📤 Session synchronized to desktop");
            }
        } catch (error) {}
    },

    async isDesktopAvailable(): Promise<boolean> {
        try {
            const response = await fetch(DESKTOP_SESSION_ENDPOINT, {
                method: "OPTIONS",
                signal: AbortSignal.timeout(1000),
            });
            return response.ok;
        } catch {
            return false;
        }
    },
};
