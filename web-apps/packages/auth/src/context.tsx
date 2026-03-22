import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { refreshTokens } from "./api";
import type { AuthUser } from "./types";

export interface AuthContextValue {
    accessToken: string | null;
    user: AuthUser | null;
    isLoading: boolean;
    setSession: (accessToken: string, user: AuthUser) => void;
    clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        refreshTokens()
            .then((session) => {
                setAccessToken(session.accessToken);
                setUser(session.user);
            })
            .catch(() => {
                // No valid refresh token — user needs to log in
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    const setSession = useCallback((token: string, authUser: AuthUser) => {
        setAccessToken(token);
        setUser(authUser);
    }, []);

    const clearSession = useCallback(() => {
        setAccessToken(null);
        setUser(null);
    }, []);

    return (
        <AuthContext
            value={{ accessToken, user, isLoading, setSession, clearSession }}
        >
            {children}
        </AuthContext>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
