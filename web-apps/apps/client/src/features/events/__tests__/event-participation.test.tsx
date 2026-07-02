import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Event } from "@workspace/shared/lib/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventParticipation } from "../components/event-participation";

vi.mock("@workspace/shared/lib/api", () => ({
    apiGet: vi.fn(),
    apiPost: vi.fn(),
}));

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: "fr" },
    }),
}));

import { apiGet, apiPost } from "@workspace/shared/lib/api";

function renderWithQueryClient(ui: ReactNode) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return render(
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    );
}

function buildEvent(overrides: Partial<Event> = {}): Event {
    return {
        _id: "evt-1",
        title: "Neighborhood party",
        description: "Big annual party",
        category: "community",
        date: "2999-06-21T18:00:00Z",
        neighborhoodId: "nbh-1",
        interestedUserIds: [],
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiGet).mockResolvedValue({ id: "me" });
});

describe("EventParticipation", () => {
    it("shows the participant count", () => {
        renderWithQueryClient(
            <EventParticipation
                event={buildEvent({ interestedUserIds: ["a", "b"] })}
            />,
        );
        expect(screen.getByText("pages.events.participants")).toBeDefined();
    });

    it("posts the participation with the participate source", async () => {
        vi.mocked(apiPost).mockResolvedValue({ interested: 1 });
        renderWithQueryClient(<EventParticipation event={buildEvent()} />);

        fireEvent.click(screen.getByText("pages.events.participate"));

        await waitFor(() =>
            expect(apiPost).toHaveBeenCalledWith("/events/evt-1/interest", {
                source: "participate",
            }),
        );
    });

    it("shows the registered state when the user already participates", async () => {
        renderWithQueryClient(
            <EventParticipation
                event={buildEvent({ interestedUserIds: ["me"] })}
            />,
        );
        expect(
            await screen.findByText("pages.events.registered"),
        ).toBeDefined();
        expect(screen.queryByText("pages.events.participate")).toBeNull();
    });
});
