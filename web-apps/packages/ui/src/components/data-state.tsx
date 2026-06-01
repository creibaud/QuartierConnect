import * as React from "react";
import { Alert01Icon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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

function errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "Une erreur est survenue. Réessayez.";
}

export function DataState({
    loading,
    error,
    isEmpty,
    skeleton,
    empty,
    onRetry,
    errorTitle = "Impossible de charger les données",
    children,
}: DataStateProps) {
    if (loading) {
        return <>{skeleton}</>;
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <HugeiconsIcon icon={Alert01Icon} />
                <AlertTitle>{errorTitle}</AlertTitle>
                <AlertDescription>{errorMessage(error)}</AlertDescription>
                {onRetry ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-fit"
                        onClick={onRetry}
                    >
                        <HugeiconsIcon icon={Refresh01Icon} />
                        Réessayer
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
