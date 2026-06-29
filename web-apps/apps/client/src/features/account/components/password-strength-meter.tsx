import { useTranslation } from "react-i18next";
import { getPasswordStrength } from "@/features/account/lib/password-strength";

export function PasswordStrengthMeter({ password }: { password: string }) {
    const { t } = useTranslation();

    if (!password) return null;

    const strength = getPasswordStrength(password);

    return (
        <div className="space-y-1">
            <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                    <span
                        key={i}
                        className={`h-1 flex-1 rounded-full ${i <= strength.score ? strength.barClass : "bg-muted"}`}
                    />
                ))}
            </div>
            <p className={`text-xs font-medium ${strength.textClass}`}>
                {t(strength.labelKey)}
            </p>
            {strength.warning && (
                <p className="text-muted-foreground text-xs">
                    {strength.warning}
                </p>
            )}
        </div>
    );
}
