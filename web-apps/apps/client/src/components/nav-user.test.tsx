import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavUser } from "./nav-user";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("@workspace/shared/lib/api", () => ({
    apiPost: vi.fn(),
    assetUrl: (path: string) => path,
}));

vi.mock("@workspace/shared/lib/auth", () => ({
    clearTokens: vi.fn(),
    getCurrentUser: vi.fn(() => ({
        sub: "user-1",
        email: "eloise@example.com",
        role: "resident",
        firstName: "Éloïse",
        lastName: "Müller",
        exp: 4102444800,
    })),
}));

vi.mock("@tanstack/react-router", () => ({
    Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
    useNavigate: () => navigateMock,
}));

vi.mock("@workspace/shared/lib/hooks/useLocale", () => ({
    useLocale: () => ({
        t: (key: string) => key,
        locale: "fr",
        setLocale: vi.fn(),
    }),
}));

vi.mock("@workspace/shared/lib/hooks/useMe", () => ({
    useMyProfile: () => ({ data: undefined }),
}));

vi.mock("@/components/theme-provider", () => ({
    useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}));

vi.mock("@hugeicons/react", () => ({
    HugeiconsIcon: () => <span />,
}));

function passthrough({ children }: { children?: ReactNode }) {
    return <div>{children}</div>;
}

function clickable({
    children,
    onClick,
}: {
    children?: ReactNode;
    onClick?: () => void;
}) {
    return <div onClick={onClick}>{children}</div>;
}

vi.mock("@workspace/ui/components/avatar", () => ({
    Avatar: passthrough,
    AvatarFallback: passthrough,
    AvatarImage: () => null,
}));

vi.mock("@workspace/ui/components/dropdown-menu", () => ({
    DropdownMenu: passthrough,
    DropdownMenuContent: passthrough,
    DropdownMenuItem: clickable,
    DropdownMenuLabel: passthrough,
    DropdownMenuRadioGroup: passthrough,
    DropdownMenuRadioItem: passthrough,
    DropdownMenuSeparator: () => null,
    DropdownMenuSub: passthrough,
    DropdownMenuSubContent: passthrough,
    DropdownMenuSubTrigger: passthrough,
    DropdownMenuTrigger: passthrough,
}));

vi.mock("@workspace/ui/components/sidebar", () => ({
    SidebarMenu: passthrough,
    SidebarMenuButton: passthrough,
    SidebarMenuItem: passthrough,
    useSidebar: () => ({ isMobile: false }),
}));

import { apiPost } from "@workspace/shared/lib/api";
import { clearTokens } from "@workspace/shared/lib/auth";

function renderWithQueryClient(ui: ReactNode) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(["points", "balance"], { balance: 42 });
    render(
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    );
    return queryClient;
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiPost).mockResolvedValue({});
});

describe("NavUser logout", () => {
    it("révoque la session serveur via POST /auth/logout", async () => {
        renderWithQueryClient(<NavUser />);

        fireEvent.click(screen.getByText("auth.logout"));

        await waitFor(() =>
            expect(apiPost).toHaveBeenCalledWith("/auth/logout", {}),
        );
    });

    it("vide les tokens et le cache react-query avant la redirection", async () => {
        const queryClient = renderWithQueryClient(<NavUser />);

        fireEvent.click(screen.getByText("auth.logout"));

        await waitFor(() =>
            expect(navigateMock).toHaveBeenCalledWith({ to: "/login" }),
        );
        expect(clearTokens).toHaveBeenCalled();
        expect(
            queryClient.getQueryData(["points", "balance"]),
        ).toBeUndefined();
    });

    it("se déconnecte localement même si la révocation serveur échoue", async () => {
        vi.mocked(apiPost).mockRejectedValue(new Error("Failed to fetch"));
        renderWithQueryClient(<NavUser />);

        fireEvent.click(screen.getByText("auth.logout"));

        await waitFor(() =>
            expect(navigateMock).toHaveBeenCalledWith({ to: "/login" }),
        );
        expect(clearTokens).toHaveBeenCalled();
    });
});

describe("NavUser thème", () => {
    it("affiche les libellés de thème via i18n", () => {
        renderWithQueryClient(<NavUser />);

        expect(screen.getByText("common.theme.label")).toBeDefined();
        expect(screen.getByText("common.theme.light")).toBeDefined();
        expect(screen.getByText("common.theme.dark")).toBeDefined();
        expect(screen.getByText("common.theme.system")).toBeDefined();
    });
});
