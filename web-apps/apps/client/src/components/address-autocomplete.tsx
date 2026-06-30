import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiGet } from "@workspace/shared/lib/api";
import { Input } from "@workspace/ui/components/input";

export type AddressSuggestion = { label: string; lat: number; lng: number };

interface Props {
    id?: string;
    value: string;
    onChange: (text: string) => void;
    onSelect: (s: AddressSuggestion) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function AddressAutocomplete({ id, value, onChange, onSelect, placeholder, disabled }: Props) {
    const { t } = useTranslation();
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [open, setOpen] = useState(false);
    const justSelected = useRef(false);

    useEffect(() => {
        if (justSelected.current) {
            justSelected.current = false;
            return;
        }
        const q = value.trim();
        const handle = setTimeout(() => {
            if (q.length < 3) {
                setSuggestions([]);
                setOpen(false);
                return;
            }
            void apiGet<AddressSuggestion[]>(
                `/geocoding/search?q=${encodeURIComponent(q)}`,
            )
                .then((res) => {
                    setSuggestions(res);
                    setOpen(true);
                })
                .catch(() => setSuggestions([]));
        }, 350);
        return () => clearTimeout(handle);
    }, [value]);

    return (
        <div className="relative">
            <Input
                id={id}
                value={value}
                disabled={disabled}
                placeholder={placeholder ?? t("address.searchPlaceholder")}
                onChange={(e) => onChange(e.target.value)}
                autoComplete="off"
            />
            {open && suggestions.length > 0 && (
                <ul className="bg-popover absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border p-1 text-sm shadow-md">
                    {suggestions.map((s) => (
                        <li key={`${s.lat},${s.lng},${s.label}`}>
                            <button
                                type="button"
                                className="hover:bg-muted w-full rounded px-2 py-1.5 text-left"
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
            )}
        </div>
    );
}
