import * as React from "react";
import { Alert01Icon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";

export interface DataStateProps {
    loading?: boolean;
    error?: unknown;
    isEmpty?: boolean;
    skeleton?: React.ReactNode;
    empty?: React.ReactNode;
    onRetry?: () => void;
    errorTitle?: string;
    children: React.ReactNode;
}

function errorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return fallback;
}

export function DataState({
    loading,
    error,
    isEmpty,
    skeleton,
    empty,
    onRetry,
    errorTitle,
    children,
}: DataStateProps) {
    const { t } = useTranslation();
    if (loading) {
        return <>{skeleton}</>;
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <HugeiconsIcon icon={Alert01Icon} />
                <AlertTitle>{errorTitle ?? t("common.loadError")}</AlertTitle>
                <AlertDescription>{errorMessage(error, t("common.error"))}</AlertDescription>
                {onRetry ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-fit"
                        onClick={onRetry}
                    >
                        <HugeiconsIcon icon={Refresh01Icon} />
                        {t("common.retry")}
                    </Button>
                ) : null}
            </Alert>
        );
    }

    if (isEmpty) {
        return <>{empty}</>;
    }

    return <>{children}</>;
}
