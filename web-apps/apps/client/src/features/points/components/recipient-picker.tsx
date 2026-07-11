import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useDebouncedValue } from "@workspace/shared/lib/hooks/useDebouncedValue";
import {
    type UserSearchResult,
    useUserSearch,
} from "@workspace/shared/lib/hooks/useUserSearch";
import { Button } from "@workspace/ui/components/button";
import {
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
} from "@workspace/ui/components/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@workspace/ui/components/popover";

export function RecipientPicker({
    recipient,
    onSelect,
}: {
    recipient: UserSearchResult | null;
    onSelect: (user: UserSearchResult) => void;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebouncedValue(query, 250);
    const { data: results = [], isFetching } = useUserSearch(debouncedQuery);

    const emptyMessage =
        debouncedQuery.trim().length < 2
            ? t("pages.points.recipientHint")
            : isFetching
              ? t("pages.points.recipientSearching")
              : t("pages.points.recipientNoResults");

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id="points-recipient"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                >
                    <span
                        className={recipient ? "" : "text-muted-foreground"}
                    >
                        {recipient
                            ? recipient.email
                            : t("pages.points.recipientPlaceholder")}
                    </span>
                    <HugeiconsIcon
                        icon={ArrowDown01Icon}
                        className="text-muted-foreground size-4 shrink-0"
                    />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-(--radix-popover-trigger-width) p-0"
                align="start"
            >
                <Command shouldFilter={false}>
                    <CommandInput
                        value={query}
                        onValueChange={setQuery}
                        placeholder={t(
                            "pages.points.recipientSearchPlaceholder",
                        )}
                    />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        {results.map((user) => (
                            <CommandItem
                                key={user.id}
                                value={user.id}
                                onSelect={() => {
                                    onSelect(user);
                                    setQuery("");
                                    setOpen(false);
                                }}
                            >
                                {user.email}
                            </CommandItem>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
