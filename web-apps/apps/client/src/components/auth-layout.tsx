import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { BrandLogo } from "./brand-logo";

/** Shared shell for the auth screens (login, register): warm ambience,
 *  brand lockup, and a centered card slot, with a staggered entrance. */
export function AuthLayout({
    subtitle,
    children,
}: {
    subtitle: string;
    children: ReactNode;
}) {
    const reduce = useReducedMotion();

    const container: Variants = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: reduce ? 0 : 0.1,
                delayChildren: reduce ? 0 : 0.05,
            },
        },
    };
    const item: Variants = {
        hidden: { opacity: 0, y: reduce ? 0 : 14 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 260, damping: 24 },
        },
    };

    return (
        <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
            <div
                aria-hidden
                className="bg-background pointer-events-none absolute inset-0 -z-10"
            >
                <div className="bg-primary/10 absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full blur-3xl" />
            </div>

            <motion.div
                variants={container}
                initial="hidden"
                animate="visible"
                className="w-full max-w-sm"
            >
                <motion.header
                    variants={item}
                    className="mb-8 flex flex-col items-center text-center"
                >
                    <span className="bg-primary text-primary-foreground inline-flex size-16 items-center justify-center rounded-2xl shadow-sm">
                        <BrandLogo className="size-9" />
                    </span>
                    <h1 className="font-heading text-foreground mt-4 text-3xl font-semibold tracking-tight">
                        QuartierConnect
                    </h1>
                    <p className="text-muted-foreground mt-1.5 text-sm text-balance">
                        {subtitle}
                    </p>
                </motion.header>
                <motion.div variants={item}>{children}</motion.div>
            </motion.div>
        </div>
    );
}
