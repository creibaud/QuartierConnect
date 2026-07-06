interface PasswordChangeError {
    code?: string;
    message?: string;
    status?: number;
}

/**
 * Picks the i18n key describing why a password change failed.
 *
 * Only an authentication failure (HTTP 401) means the current password or the
 * TOTP code was rejected. Any other failure (server error, network outage) is
 * reported with a generic message instead of wrongly blaming the password.
 */
export function passwordChangeErrorKey(error: PasswordChangeError): string {
    if (error.status !== 401) {
        return "pages.account.passwordChangeFailed";
    }
    const totpRejected =
        error.code === "INVALID_TOTP" || /totp/i.test(error.message ?? "");
    return totpRejected
        ? "auth.errors.invalidTotpCheckApp"
        : "pages.account.currentPasswordWrong";
}
