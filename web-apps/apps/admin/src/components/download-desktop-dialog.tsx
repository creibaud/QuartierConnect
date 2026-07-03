import { Download01Icon, JavaIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@workspace/ui/components/dialog";
import { SidebarMenuButton } from "@workspace/ui/components/sidebar";

type LogoProps = { className?: string };

function WindowsLogo({ className }: LogoProps) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M3 4.6 11 3.5v8.1H3V4.6zM12 3.35 21 2v9.6h-9V3.35zM3 12.5h8v8.1L3 19.4v-6.9zM12 12.5h9V22l-9-1.35V12.5z" />
        </svg>
    );
}

function AppleLogo({ className }: LogoProps) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M16.365 1.43c0 1.14-.42 2.2-1.12 2.99-.85.95-2.24 1.68-3.38 1.59-.14-1.11.42-2.28 1.06-3.01.72-.82 1.98-1.44 3.06-1.5.06.4.06.63.06.93zM20.5 17.2c-.55 1.27-.82 1.84-1.53 2.96-.99 1.56-2.38 3.5-4.11 3.51-1.53.01-1.93-1-4.01-.99-2.08.01-2.52 1.01-4.05.99-1.73-.02-3.05-1.77-4.04-3.33-2.78-4.35-1.68-10.05 1.82-10.8 1.3-.28 2.5.55 3.28.55.78 0 2.3-.68 3.87-.58.66.03 2.5.27 3.7 2.01-3.24 1.99-2.72 6.68 1.35 8.12z" />
        </svg>
    );
}

function LinuxLogo({ className }: LogoProps) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M12 2C10 2 8.8 3.7 8.8 5.8c0 .5 0 1 .1 1.5-.1.8-.7 1.5-1.5 2.4-1.2 1.6-2.4 3.3-2.4 5.2 0 .6.2 1.2.6 1.6-.5.8-1.3 2-1.7 3-.2.5.1 1.1.7 1.2l2.2.4c.5.8 1.5 1.5 3 1.5h.2c1.5 0 2.5-.7 3-1.5l2.2-.4c.6-.1.9-.7.7-1.2-.4-1-1.2-2.2-1.7-3 .4-.4.6-1 .6-1.6 0-1.9-1.2-3.6-2.4-5.2-.8-.9-1.4-1.6-1.5-2.4.1-.5.1-1 .1-1.5C15.2 3.7 14 2 12 2z" />
        </svg>
    );
}

function JavaLogo({ className }: LogoProps) {
    return <HugeiconsIcon icon={JavaIcon} className={className} />;
}

const DOWNLOADS = [
    { name: "Windows", format: ".msi", size: "56 Mo", file: "quartierconnect-windows.msi", Logo: WindowsLogo },
    { name: "macOS", format: ".dmg", size: "57 Mo", file: "quartierconnect-macos.dmg", Logo: AppleLogo },
    { name: "Linux", format: ".deb", size: "49 Mo", file: "quartierconnect-linux.deb", Logo: LinuxLogo },
    { name: "Portable (Java)", format: ".jar", size: "29 Mo", file: "quartierconnect-desktop.jar", Logo: JavaLogo },
] as const;

export function DownloadDesktopDialog() {
    const { t } = useTranslation();
    return (
        <Dialog>
            <DialogTrigger asChild>
                <SidebarMenuButton tooltip={t("nav.downloadDesktop")}>
                    <HugeiconsIcon icon={Download01Icon} />
                    <span>{t("nav.downloadDesktop")}</span>
                </SidebarMenuButton>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("adminPages.download.title")}</DialogTitle>
                    <DialogDescription>
                        {t("adminPages.download.description")}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                    {DOWNLOADS.map(({ name, format, size, file, Logo }) => (
                        <a
                            key={file}
                            href={`/telechargements/${file}`}
                            download
                            className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
                        >
                            <Logo className="size-7 shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium">{name}</p>
                                <p className="text-muted-foreground text-xs">
                                    {format} · {size}
                                </p>
                            </div>
                            <HugeiconsIcon
                                icon={Download01Icon}
                                className="text-muted-foreground size-4"
                            />
                        </a>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
