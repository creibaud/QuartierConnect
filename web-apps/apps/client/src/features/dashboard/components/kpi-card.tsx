import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@workspace/ui/components/card";

export function KpiCard({
    label,
    value,
    icon,
    to,
}: {
    label: string;
    value: number | string;
    icon: IconSvgElement;
    to?: string;
}) {
    const body = (
        <Card className="h-full">
            <CardContent className="flex items-center gap-3 p-4">
                <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <HugeiconsIcon icon={icon} className="size-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-2xl font-semibold tabular-nums leading-none">{value}</p>
                    <p className="text-muted-foreground mt-1 truncate text-xs">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
    return to ? (
        <Link to={to} className="block">
            {body}
        </Link>
    ) : (
        body
    );
}
