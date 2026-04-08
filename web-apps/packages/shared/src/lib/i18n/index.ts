import { initReactI18next } from "react-i18next";
import i18n from "i18next";
import en from "./en";
import fr from "./fr";

export type Locale = "fr" | "en";

const STORAGE_KEY = "qc_locale";

export const resources = {
    fr: { translation: fr },
    en: { translation: en },
} as const;

export type TranslationKeys = typeof fr;

if (!i18n.isInitialized) {
    const savedLocale = (localStorage.getItem(STORAGE_KEY) ?? "fr") as Locale;

    void i18n.use(initReactI18next).init({
        resources,
        lng: savedLocale,
        fallbackLng: "fr",
        interpolation: { escapeValue: false },
    });
}

export function setLocale(locale: Locale) {
    localStorage.setItem(STORAGE_KEY, locale);
    void i18n.changeLanguage(locale);
}

export function getLocale(): Locale {
    return (i18n.language as Locale) ?? "fr";
}

export { i18n };
export default i18n;
