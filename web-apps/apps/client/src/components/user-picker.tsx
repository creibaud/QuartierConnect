import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { assetUrl } from "@workspace/shared/lib/api";
import { useDebouncedValue } from "@workspace/shared/lib/hooks/useDebouncedValue";
import {
    useUserSearch,
    type UserSearchResult,
} from "@workspace/shared/lib/hooks/useUserSearch";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@workspace/ui/components/avatar";
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

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

function fullName(user: UserSearchResult): string {
    return [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
}

function initials(user: UserSearchResult): string {
    const name = fullName(user);
    if (!name) return user.email.slice(0, 2).toUpperCase();
    const [first = "", last = ""] = [user.firstName ?? "", user.lastName ?? ""];
    return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function UserAvatar({
    user,
    size,
}: {
    user: UserSearchResult;
    size: "sm" | "default";
}) {
    return (
        <Avatar size={size}>
            {/* The avatar endpoint is public, so a plain image URL is enough. */}
            <AvatarImage
                src={user.avatarUrl ? assetUrl(user.avatarUrl) : undefined}
                alt=""
            />
            <AvatarFallback>{initials(user)}</AvatarFallback>
        </Avatar>
    );
}

/**
 * Searches people by name or email and renders each match with their avatar,
 * so the picker identifies a neighbour rather than just echoing an address.
 */
export function UserPicker({
    id,
    selected,
    onSelect,
    placeholder,
}: {
    id?: string;
    selected: UserSearchResult | null;
    onSelect: (user: UserSearchResult) => void;
    placeholder?: string;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
    const {
        data: results = [],
        isFetching,
        isError,
    } = useUserSearch(debouncedQuery);

    // A failed request would otherwise read as "nobody matches", which sends
    // the user hunting for a better spelling instead of retrying.
    const emptyMessage =
        debouncedQuery.trim().length < MIN_QUERY_LENGTH
            ? t("userPicker.hint")
            : isFetching
              ? t("userPicker.searching")
              : isError
                ? t("userPicker.error")
                : t("userPicker.noResults");

    const selectedName = selected ? fullName(selected) : "";

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="h-auto w-full justify-between py-2 font-normal"
                >
                    {selected ? (
                        <span className="flex min-w-0 items-center gap-2">
                            <UserAvatar user={selected} size="sm" />
                            <span className="truncate">
                                {selectedName || selected.email}
                            </span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground truncate">
                            {placeholder ?? t("userPicker.placeholder")}
                        </span>
                    )}
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
                        placeholder={t("userPicker.searchPlaceholder")}
                    />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        {results.map((user) => {
                            const name = fullName(user);
                            return (
                                <CommandItem
                                    key={user.id}
                                    value={user.id}
                                    onSelect={() => {
                                        onSelect(user);
                                        setQuery("");
                                        setOpen(false);
                                    }}
                                    className="gap-2"
                                >
                                    <UserAvatar user={user} size="default" />
                                    <span className="flex min-w-0 flex-col">
                                        {/* Nameless accounts show the email
                                            alone instead of an empty line. */}
                                        {name ? (
                                            <>
                                                <span className="truncate">
                                                    {name}
                                                </span>
                                                <span className="text-muted-foreground truncate text-xs">
                                                    {user.email}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="truncate">
                                                {user.email}
                                            </span>
                                        )}
                                    </span>
                                </CommandItem>
                            );
                        })}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
