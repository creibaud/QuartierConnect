import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiGet } from "@workspace/shared/lib/api";
import { Input } from "@workspace/ui/components/input";
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from "@workspace/ui/components/popover";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

export type AddressSuggestion = { label: string; lat: number; lng: number };

interface Props {
    id?: string;
    value: string;
    onChange: (text: string) => void;
    onSelect: (s: AddressSuggestion) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function AddressAutocomplete({
    id,
    value,
    onChange,
    onSelect,
    placeholder,
    disabled,
}: Props) {
    const { t, i18n } = useTranslation();
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [open, setOpen] = useState(false);
    const justSelected = useRef(false);

    const showDropdown =
        open && value.trim().length >= 3 && suggestions.length > 0;

    useEffect(() => {
        if (justSelected.current) {
            justSelected.current = false;
            return;
        }
        const q = value.trim();
        if (q.length < 3) return;
        const handle = setTimeout(() => {
            const params = new URLSearchParams({ q, lang: i18n.language });
            void apiGet<AddressSuggestion[]>(
                `/geocoding/search?${params.toString()}`,
            )
                .then((res) => {
                    setSuggestions(res);
                    setOpen(true);
                })
                .catch(() => {
                    setSuggestions([]);
                    setOpen(false);
                });
        }, 350);
        return () => clearTimeout(handle);
    }, [value, i18n.language]);

    return (
        // Popover portals the list (so no Card/ScrollArea/dialog overflow can
        // clip it) and is dialog-aware (selecting a suggestion never closes a
        // parent dialog).
        <Popover
            open={showDropdown}
            onOpenChange={(next) => {
                if (!next) setOpen(false);
            }}
        >
            <PopoverAnchor asChild>
                <Input
                    id={id}
                    value={value}
                    disabled={disabled}
                    placeholder={placeholder ?? t("address.searchPlaceholder")}
                    onChange={(e) => onChange(e.target.value)}
                    autoComplete="off"
                />
            </PopoverAnchor>
            <PopoverContent
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="w-(--radix-popover-trigger-width) p-0"
            >
                <ScrollArea viewportClassName="max-h-56">
                    <ul className="p-1">
                        {suggestions.map((s) => (
                            <li key={`${s.lat},${s.lng},${s.label}`}>
                                <button
                                    type="button"
                                    className="hover:bg-muted w-full truncate rounded px-2 py-1.5 text-left"
                                    onClick={() => {
                                        justSelected.current = true;
                                        onChange(s.label);
                                        onSelect(s);
                                        setOpen(false);
                                        setSuggestions([]);
                                    }}
                                >
                                    {s.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
