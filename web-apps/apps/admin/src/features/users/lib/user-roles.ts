import type { TFunction } from "i18next";

export const ROLE_VARIANTS: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
> = {
    resident: "secondary",
    moderator: "default",
    admin: "default",
    banned: "destructive",
};

export function getRoleLabel(role: string, t: TFunction): string {
    const labels: Record<string, string> = {
        resident: t("adminPages.roles.resident"),
        moderator: t("adminPages.roles.moderator"),
        admin: t("adminPages.roles.admin"),
        banned: t("adminPages.roles.banned"),
        deleted: t("adminPages.roles.deleted"),
    };
    return labels[role] ?? role;
}
