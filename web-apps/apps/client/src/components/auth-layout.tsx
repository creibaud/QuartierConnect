import type { ReactNode } from "react";
import { BrandLogo } from "./brand-logo";

/** Shared shell for the auth screens (login, register): warm ambience,
 *  brand lockup, and a centered card slot. */
export function AuthLayout({
    subtitle,
    children,
}: {
    subtitle: string;
    children: ReactNode;
}) {
    return (
        <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
            <div
                aria-hidden
                className="bg-background pointer-events-none absolute inset-0 -z-10"
            >
                <div className="bg-primary/10 absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-sm motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-bottom-3 motion-safe:duration-500">
                <header className="mb-8 flex flex-col items-center text-center">
                    <BrandLogo className="text-primary size-16" />
                    <h1 className="font-heading text-foreground mt-4 text-3xl font-semibold tracking-tight">
                        QuartierConnect
                    </h1>
                    <p className="text-muted-foreground mt-1.5 text-sm text-balance">
                        {subtitle}
                    </p>
                </header>
                {children}
            </div>
        </div>
    );
}
