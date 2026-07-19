import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { UserSearchResult } from "@workspace/shared/lib/hooks/useUserSearch";
import { UserPicker } from "./user-picker";

const searchMock = vi.hoisted(() => vi.fn());

vi.mock("@workspace/shared/lib/api", () => ({
    assetUrl: (path: string) => `http://api.test${path}`,
}));

vi.mock("@workspace/shared/lib/hooks/useUserSearch", () => ({
    useUserSearch: searchMock,
}));

// The debounce would otherwise hold the query back past the assertions.
vi.mock("@workspace/shared/lib/hooks/useDebouncedValue", () => ({
    useDebouncedValue: (value: string) => value,
}));

vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@hugeicons/react", () => ({ HugeiconsIcon: () => <span /> }));

function passthrough({ children }: { children?: ReactNode }) {
    return <div>{children}</div>;
}

vi.mock("@workspace/ui/components/avatar", () => ({
    Avatar: passthrough,
    AvatarFallback: ({ children }: { children?: ReactNode }) => (
        <span data-testid="initials">{children}</span>
    ),
    AvatarImage: ({ src }: { src?: string }) =>
        src ? <img data-testid="avatar-img" src={src} alt="" /> : null,
}));

vi.mock("@workspace/ui/components/button", () => ({
    Button: ({ children, ...props }: { children?: ReactNode }) => (
        <button {...props}>{children}</button>
    ),
}));

// Popover and Command are rendered inline so the list is always in the DOM.
vi.mock("@workspace/ui/components/popover", () => ({
    Popover: passthrough,
    PopoverContent: passthrough,
    PopoverTrigger: passthrough,
}));

vi.mock("@workspace/ui/components/command", () => ({
    Command: passthrough,
    CommandEmpty: ({ children }: { children?: ReactNode }) => (
        <div data-testid="empty">{children}</div>
    ),
    CommandInput: ({
        value,
        onValueChange,
    }: {
        value: string;
        onValueChange: (v: string) => void;
    }) => (
        <input
            data-testid="search"
            aria-label="search"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
        />
    ),
    CommandItem: ({
        children,
        onSelect,
    }: {
        children?: ReactNode;
        onSelect?: () => void;
    }) => (
        <button
            type="button"
            role="option"
            aria-selected={false}
            onClick={onSelect}
        >
            {children}
        </button>
    ),
    CommandList: passthrough,
}));

function user(overrides: Partial<UserSearchResult> = {}): UserSearchResult {
    return {
        id: "u1",
        email: "camille.bernard@demo.fr",
        role: "resident",
        firstName: "Camille",
        lastName: "Bernard",
        avatarUrl: null,
        ...overrides,
    };
}

function searchReturns(
    results: UserSearchResult[],
    state: { isFetching?: boolean; isError?: boolean } = {},
) {
    searchMock.mockReturnValue({
        data: results,
        isFetching: state.isFetching ?? false,
        isError: state.isError ?? false,
    });
}

function typeQuery(text: string) {
    fireEvent.change(screen.getByTestId("search"), { target: { value: text } });
}

beforeEach(() => {
    vi.clearAllMocks();
    searchReturns([]);
});

describe("UserPicker rows", () => {
    it("shows the full name and the email on separate lines", () => {
        searchReturns([user()]);
        render(<UserPicker selected={null} onSelect={vi.fn()} />);

        expect(screen.getByText("Camille Bernard")).toBeDefined();
        expect(screen.getByText("camille.bernard@demo.fr")).toBeDefined();
    });

    it("shows the email alone when the account has no name", () => {
        searchReturns([
            user({ firstName: null, lastName: null, email: "e2e_1@test.fr" }),
        ]);
        render(<UserPicker selected={null} onSelect={vi.fn()} />);

        const row = screen.getByRole("option");
        expect(row.textContent).toContain("e2e_1@test.fr");
        // Only the initials span and the email span, so no blank name line.
        expect(row.querySelectorAll("span:empty").length).toBe(0);
    });

    it("derives the initials from the name", () => {
        searchReturns([user()]);
        render(<UserPicker selected={null} onSelect={vi.fn()} />);

        expect(screen.getByTestId("initials").textContent).toBe("CB");
    });

    it("falls back to the email for the initials of a nameless account", () => {
        searchReturns([
            user({ firstName: null, lastName: null, email: "e2e_1@test.fr" }),
        ]);
        render(<UserPicker selected={null} onSelect={vi.fn()} />);

        expect(screen.getByTestId("initials").textContent).toBe("E2");
    });

    it("renders no image when the account has no avatar", () => {
        searchReturns([user()]);
        render(<UserPicker selected={null} onSelect={vi.fn()} />);

        expect(screen.queryByTestId("avatar-img")).toBeNull();
    });

    it("points the avatar at the api asset url", () => {
        searchReturns([user({ avatarUrl: "/users/avatar/abc" })]);
        render(<UserPicker selected={null} onSelect={vi.fn()} />);

        expect(screen.getByTestId("avatar-img").getAttribute("src")).toBe(
            "http://api.test/users/avatar/abc",
        );
    });

    it("hands the whole match back on select", () => {
        const onSelect = vi.fn();
        const match = user();
        searchReturns([match]);
        render(<UserPicker selected={null} onSelect={onSelect} />);

        fireEvent.click(screen.getByRole("option"));

        expect(onSelect).toHaveBeenCalledWith(match);
    });
});

describe("UserPicker empty states", () => {
    it("asks for more characters below the minimum query length", () => {
        render(<UserPicker selected={null} onSelect={vi.fn()} />);
        typeQuery("c");

        expect(screen.getByTestId("empty").textContent).toBe("userPicker.hint");
    });

    it("reports a failed search instead of claiming nobody matched", () => {
        searchReturns([], { isError: true });
        render(<UserPicker selected={null} onSelect={vi.fn()} />);
        typeQuery("camille");

        expect(screen.getByTestId("empty").textContent).toBe(
            "userPicker.error",
        );
    });

    it("says nobody matched when the search succeeded and came back empty", () => {
        searchReturns([]);
        render(<UserPicker selected={null} onSelect={vi.fn()} />);
        typeQuery("camille");

        expect(screen.getByTestId("empty").textContent).toBe(
            "userPicker.noResults",
        );
    });
});

describe("UserPicker trigger", () => {
    it("uses the caller placeholder while nothing is selected", () => {
        render(
            <UserPicker
                selected={null}
                onSelect={vi.fn()}
                placeholder="pick a neighbour"
            />,
        );

        expect(screen.getByText("pick a neighbour")).toBeDefined();
    });

    it("shows the name of the selected person, not their email", () => {
        render(<UserPicker selected={user()} onSelect={vi.fn()} />);

        expect(screen.getByRole("combobox").textContent).toContain(
            "Camille Bernard",
        );
        expect(screen.getByRole("combobox").textContent).not.toContain(
            "camille.bernard@demo.fr",
        );
    });

    it("falls back to the email when the selected person has no name", () => {
        render(
            <UserPicker
                selected={user({ firstName: null, lastName: null })}
                onSelect={vi.fn()}
            />,
        );

        expect(screen.getByRole("combobox").textContent).toContain(
            "camille.bernard@demo.fr",
        );
    });
});
