export interface AuthUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
}

export interface LoginPendingTotp {
    requiresTotp: true;
    totpToken: string;
}

export type LoginResult = AuthTokens | LoginPendingTotp;

export function isPendingTotp(result: LoginResult): result is LoginPendingTotp {
    return "requiresTotp" in result && result.requiresTotp === true;
}
