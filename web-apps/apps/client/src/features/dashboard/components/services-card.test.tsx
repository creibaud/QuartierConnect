import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServicesCard } from "./services-card";

const useServicesMock = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: "fr" },
    }),
}));

vi.mock("@tanstack/react-router", () => ({
    Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock("@workspace/shared/lib/hooks/services.hooks", () => ({
    useServices: () => useServicesMock(),
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe("ServicesCard", () => {
    it("affiche un état d'erreur distinct quand la requête échoue", () => {
        useServicesMock.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            refetch: vi.fn(),
        });

        render(<ServicesCard />);

        expect(screen.getByText("common.loadError")).toBeDefined();
        expect(screen.queryByText("pages.dashboard.noServices")).toBeNull();
    });

    it("relance la requête quand on clique sur Réessayer", () => {
        const refetch = vi.fn();
        useServicesMock.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            refetch,
        });

        render(<ServicesCard />);
        fireEvent.click(screen.getByText("common.retry"));

        expect(refetch).toHaveBeenCalledTimes(1);
    });

    it("affiche l'état vide (et non l'erreur) quand la requête réussit sans données", () => {
        useServicesMock.mockReturnValue({
            data: [],
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
        });

        render(<ServicesCard />);

        expect(screen.getByText("pages.dashboard.noServices")).toBeDefined();
        expect(screen.queryByText("common.loadError")).toBeNull();
    });
});
