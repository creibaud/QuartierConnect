export function isStaffRole(role: string | null | undefined): boolean {
    return role === "moderator" || role === "admin";
}
