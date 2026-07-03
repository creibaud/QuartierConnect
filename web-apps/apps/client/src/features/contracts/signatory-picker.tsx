import { useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Avatar,
    AvatarFallback,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@workspace/ui/components/command";
import { Spinner } from "@workspace/ui/components/spinner";
import {
    type Neighbor,
    neighborInitials,
    useNeighborSearch,
} from "./use-neighbor-search";

export type { Neighbor };

export function SignatoryPicker({
    inputId,
    selected,
    onChange,
    enabled,
    lockedIds = [],
    maxSelected,
}: {
    inputId: string;
    selected: Neighbor[];
    onChange: (next: Neighbor[]) => void;
    enabled: boolean;
    lockedIds?: string[];
    maxSelected?: number;
}) {
    const { t } = useTranslation();
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const {
        data: neighbors,
        isLoading: neighborsLoading,
        isError: neighborsError,
    } = useNeighborSearch(deferredSearch, enabled);

    const isSelected = (id: string) =>
        selected.some((neighbor) => neighbor.id === id);
    const isLocked = (id: string) => lockedIds.includes(id);
    const atCapacity =
        maxSelected !== undefined && selected.length >= maxSelected;

    function toggleSignatory(neighbor: Neighbor) {
        if (isLocked(neighbor.id)) return;
        if (isSelected(neighbor.id)) {
            onChange(selected.filter((s) => s.id !== neighbor.id));
            return;
        }
        if (atCapacity) return;
        onChange([...selected, neighbor]);
    }

    function removeSignatory(id: string) {
        if (isLocked(id)) return;
        onChange(selected.filter((s) => s.id !== id));
    }

    return (
        <div className="space-y-2">
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selected.map((neighbor) => (
                        <Badge
                            key={neighbor.id}
                            variant="secondary"
                            className={isLocked(neighbor.id) ? "" : "gap-1 pr-1"}
                        >
                            {neighbor.name}
                            {isLocked(neighbor.id) ? (
                                <span className="text-muted-foreground">
                                    · {t("pages.contracts.import.you")}
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() =>
                                        removeSignatory(neighbor.id)
                                    }
                                    aria-label={t(
                                        "pages.contracts.removeSignatory",
                                        { name: neighbor.name },
                                    )}
                                    className="hover:bg-foreground/10 rounded-sm p-0.5"
                                >
                                    <HugeiconsIcon
                                        icon={Cancel01Icon}
                                        className="size-3"
                                    />
                                </button>
                            )}
                        </Badge>
                    ))}
                </div>
            )}
            <Command shouldFilter={false} className="rounded-lg border">
                <CommandInput
                    id={inputId}
                    value={search}
                    onValueChange={setSearch}
                    placeholder={t(
                        "pages.contracts.searchNeighborsPlaceholder",
                    )}
                />
                <CommandList className="max-h-40">
                    {neighborsLoading ? (
                        <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-sm">
                            <Spinner className="size-4" />
                            {t("pages.contracts.neighborsLoading")}
                        </div>
                    ) : neighborsError ? (
                        <div className="text-destructive py-4 text-center text-sm">
                            {t("pages.contracts.neighborsError")}
                        </div>
                    ) : (
                        <>
                            <CommandEmpty>
                                {t("pages.contracts.neighborsEmpty")}
                            </CommandEmpty>
                            <CommandGroup>
                                {(neighbors ?? []).map((neighbor) => (
                                    <CommandItem
                                        key={neighbor.id}
                                        value={neighbor.id}
                                        data-checked={isSelected(neighbor.id)}
                                        disabled={
                                            isLocked(neighbor.id) ||
                                            (atCapacity &&
                                                !isSelected(neighbor.id))
                                        }
                                        onSelect={() =>
                                            toggleSignatory(neighbor)
                                        }
                                    >
                                        <Avatar className="size-6">
                                            <AvatarFallback className="text-[10px]">
                                                {neighborInitials(
                                                    neighbor.name,
                                                )}
                                            </AvatarFallback>
                                        </Avatar>
                                        {neighbor.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </>
                    )}
                </CommandList>
            </Command>
        </div>
    );
}
