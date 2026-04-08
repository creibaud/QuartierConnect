import { useTranslation } from "react-i18next";
import { setLocale, type Locale } from "../i18n/index";

export function useLocale() {
    const { t, i18n } = useTranslation();

    return {
        t,
        locale: i18n.language as Locale,
        setLocale,
        isFR: i18n.language === "fr",
        isEN: i18n.language === "en",
    };
}
