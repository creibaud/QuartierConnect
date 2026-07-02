import type { Locale } from "date-fns";
import { enUS, fr } from "date-fns/locale";

const CALENDAR_LOCALES: Record<string, Locale> = {
    fr,
    en: enUS,
};

export function calendarLocaleFor(language: string): Locale {
    const baseLanguage = language.split("-")[0];
    return CALENDAR_LOCALES[baseLanguage] ?? fr;
}
