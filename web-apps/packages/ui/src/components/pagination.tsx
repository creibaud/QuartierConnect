import * as React from "react";
import {
    ArrowLeft01Icon,
    ArrowRight01Icon,
    MoreHorizontalCircle01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
    return (
        <nav
            role="navigation"
            aria-label="pagination"
            data-slot="pagination"
            className={cn("mx-auto flex w-full justify-center", className)}
            {...props}
        />
    );
}

function PaginationContent({
    className,
    ...props
}: React.ComponentProps<"ul">) {
    return (
        <ul
            data-slot="pagination-content"
            className={cn("flex items-center gap-0.5", className)}
            {...props}
        />
    );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
    return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
    isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
    React.ComponentProps<"a">;

function PaginationLink({
    className,
    isActive,
    size = "icon",
    ...props
}: PaginationLinkProps) {
    return (
        <Button
            asChild
            variant={isActive ? "outline" : "ghost"}
            size={size}
            className={cn(className)}
        >
            <a
                aria-current={isActive ? "page" : undefined}
                data-slot="pagination-link"
                data-active={isActive}
                {...props}
            />
        </Button>
    );
}

function PaginationPrevious({
    className,
    text = "Previous",
    ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
    return (
        <PaginationLink
            aria-label="Go to previous page"
            size="default"
            className={cn("pl-1.5!", className)}
            {...props}
        >
            <HugeiconsIcon
                icon={ArrowLeft01Icon}
                strokeWidth={2}
                data-icon="inline-start"
            />
            <span className="hidden sm:block">{text}</span>
        </PaginationLink>
    );
}

function PaginationNext({
    className,
    text = "Next",
    ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
    return (
        <PaginationLink
            aria-label="Go to next page"
            size="default"
            className={cn("pr-1.5!", className)}
            {...props}
        >
            <span className="hidden sm:block">{text}</span>
            <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                data-icon="inline-end"
            />
        </PaginationLink>
    );
}

function PaginationEllipsis({
    className,
    ...props
}: React.ComponentProps<"span">) {
    return (
        <span
            aria-hidden
            data-slot="pagination-ellipsis"
            className={cn(
                "flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}
        >
            <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} />
            <span className="sr-only">More pages</span>
        </span>
    );
}

function buildPageRange(page: number, pageCount: number): (number | "gap")[] {
    const range: (number | "gap")[] = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(pageCount - 1, page + 1);

    if (start > 2) range.push("gap");
    for (let candidate = start; candidate <= end; candidate++) {
        range.push(candidate);
    }
    if (end < pageCount - 1) range.push("gap");
    if (pageCount > 1) range.push(pageCount);

    return range;
}

function DataPagination({
    page,
    pageCount,
    onPageChange,
    previousLabel = "Go to previous page",
    nextLabel = "Go to next page",
    className,
    ...props
}: React.ComponentProps<typeof Pagination> & {
    page: number;
    pageCount: number;
    onPageChange: (page: number) => void;
    previousLabel?: string;
    nextLabel?: string;
}) {
    if (pageCount <= 1) return null;

    return (
        <Pagination className={className} {...props}>
            <PaginationContent>
                <PaginationItem>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={previousLabel}
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                    >
                        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                    </Button>
                </PaginationItem>
                {buildPageRange(page, pageCount).map((entry, index) =>
                    entry === "gap" ? (
                        <PaginationItem key={`gap-${index}`}>
                            <PaginationEllipsis />
                        </PaginationItem>
                    ) : (
                        <PaginationItem key={entry}>
                            <Button
                                variant={entry === page ? "outline" : "ghost"}
                                size="icon"
                                aria-current={
                                    entry === page ? "page" : undefined
                                }
                                onClick={() => onPageChange(entry)}
                            >
                                {entry}
                            </Button>
                        </PaginationItem>
                    ),
                )}
                <PaginationItem>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={nextLabel}
                        disabled={page >= pageCount}
                        onClick={() => onPageChange(page + 1)}
                    >
                        <HugeiconsIcon
                            icon={ArrowRight01Icon}
                            strokeWidth={2}
                        />
                    </Button>
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}

export {
    DataPagination,
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
};
