import * as React from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

export interface StatCardProps {
    label: React.ReactNode;
    value: React.ReactNode;
    hint?: React.ReactNode;
    loading?: boolean;
}

export function StatCard({ label, value, hint, loading }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                    {label}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-9 w-16" />
                ) : (
                    <p className="text-3xl font-bold tabular-nums">{value}</p>
                )}
                {hint && !loading ? (
                    <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
                ) : null}
            </CardContent>
        </Card>
    );
}
