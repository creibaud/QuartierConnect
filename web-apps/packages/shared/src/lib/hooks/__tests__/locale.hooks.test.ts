import { useTranslation } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import * as i18nModule from "../../i18n/index";
import { useLocale } from "../useLocale";

// Mock i18next and react-i18next before imports
vi.mock("react-i18next", () => ({
    useTranslation: vi.fn(() => ({
        t: (key: string) => key,
        i18n: { language: "fr", changeLanguage: vi.fn() },
    })),
}));
vi.mock("../../i18n/index", () => ({
    setLocale: vi.fn(),
}));

describe("useLocale", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns current locale from i18n", () => {
        const { result } = renderHook(() => useLocale());
        expect(result.current.locale).toBe("fr");
    });

    it("isFR is true when language is fr", () => {
        const { result } = renderHook(() => useLocale());
        expect(result.current.isFR).toBe(true);
        expect(result.current.isEN).toBe(false);
    });

    it("isEN is true when language is en", () => {
        vi.mocked(useTranslation).mockReturnValue({
            t: (key: string) => key,
            i18n: { language: "en", changeLanguage: vi.fn() },
        } as ReturnType<typeof useTranslation>);
        const { result } = renderHook(() => useLocale());
        expect(result.current.isEN).toBe(true);
        expect(result.current.isFR).toBe(false);
    });

    it("exposes setLocale function", () => {
        const { result } = renderHook(() => useLocale());
        expect(typeof result.current.setLocale).toBe("function");
    });

    it("calls setLocale when invoked", () => {
        const { result } = renderHook(() => useLocale());
        act(() => {
            result.current.setLocale("en");
        });
        expect(i18nModule.setLocale).toHaveBeenCalledWith("en");
    });
});
