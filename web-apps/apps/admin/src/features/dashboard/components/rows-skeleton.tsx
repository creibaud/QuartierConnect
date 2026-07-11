import { Skeleton } from "@workspace/ui/components/skeleton";

export function RowsSkeleton({ rows }: { rows: number }) {
    return (
        <div className="flex flex-col gap-2">
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
            ))}
        </div>
    );
}
