import { useRef, useState, type ChangeEvent } from "react";
import {
    Camera02Icon,
    PencilEdit02Icon,
    UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { assetUrl } from "@workspace/shared/lib/api";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import {
    useDeleteAvatar,
    useMyProfile,
    useUpdateProfile,
    useUploadAvatar,
} from "@workspace/shared/lib/hooks/useMe";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { resizeImageToBlob } from "@/features/account/lib/avatar";

export function ProfileCard() {
    const { t } = useTranslation();
    const jwtUser = getCurrentUser();
    const { data: profile } = useMyProfile();
    const updateProfile = useUpdateProfile();
    const uploadAvatar = useUploadAvatar();
    const deleteAvatar = useDeleteAvatar();
    const fileRef = useRef<HTMLInputElement>(null);

    const [editing, setEditing] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    const email = profile?.email ?? jwtUser?.email ?? "";
    const role = profile?.role ?? jwtUser?.role ?? "resident";
    const baseFirst = profile?.firstName ?? jwtUser?.firstName ?? "";
    const baseLast = profile?.lastName ?? jwtUser?.lastName ?? "";
    const avatarSrc = profile?.avatarUrl ? assetUrl(profile.avatarUrl) : undefined;

    const shownFirst = editing ? firstName : (baseFirst ?? "");
    const shownLast = editing ? lastName : (baseLast ?? "");
    const fullName = [shownFirst, shownLast].filter(Boolean).join(" ").trim();
    const displayName = fullName || email;
    const initials = fullName
        ? `${shownFirst[0] ?? ""}${shownLast[0] ?? ""}`.toUpperCase()
        : email.slice(0, 2).toUpperCase();
    const roleLabels: Record<string, string> = {
        resident: t("roles.resident"),
        moderator: t("roles.moderator"),
        admin: t("roles.admin"),
    };
    const roleLabel = roleLabels[role] ?? role;
    const avatarBusy = uploadAvatar.isPending || deleteAvatar.isPending;

    function startEdit() {
        setFirstName(baseFirst ?? "");
        setLastName(baseLast ?? "");
        setEditing(true);
    }

    async function handleFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
            const blob = await resizeImageToBlob(file, 256);
            uploadAvatar.mutate(blob, {
                onError: () => toast.error(t("pages.account.updateError")),
            });
        } catch {
            toast.error(t("pages.account.updateError"));
        }
    }

    function handleSave() {
        updateProfile.mutate(
            { firstName, lastName },
            {
                onSuccess: () => {
                    toast.success(t("pages.account.profileUpdated"));
                    setEditing(false);
                },
                onError: () => toast.error(t("pages.account.updateError")),
            },
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <HugeiconsIcon
                            icon={UserIcon}
                            className="text-primary size-5"
                        />
                        {t("pages.account.profile")}
                    </CardTitle>
                    {!editing && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground -mr-2"
                            onClick={startEdit}
                        >
                            <HugeiconsIcon
                                icon={PencilEdit02Icon}
                                className="size-4"
                            />
                            {t("pages.account.edit")}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {editing ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                disabled={avatarBusy}
                                className="group relative shrink-0 rounded-full"
                            >
                                <Avatar className="size-14">
                                    <AvatarImage
                                        src={avatarSrc}
                                        className="object-cover"
                                    />
                                    <AvatarFallback className="text-lg">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="bg-foreground/45 absolute inset-0 flex items-center justify-center rounded-full opacity-0 transition group-hover:opacity-100">
                                    <HugeiconsIcon
                                        icon={Camera02Icon}
                                        className="size-5 text-white"
                                    />
                                </span>
                            </button>
                            <div className="flex flex-col items-start gap-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={avatarBusy}
                                    onClick={() => fileRef.current?.click()}
                                >
                                    <HugeiconsIcon
                                        icon={Camera02Icon}
                                        className="size-4"
                                    />
                                    {t("pages.account.changePhoto")}
                                </Button>
                                {avatarSrc && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground"
                                        disabled={avatarBusy}
                                        onClick={() => deleteAvatar.mutate()}
                                    >
                                        {t("pages.account.removePhoto")}
                                    </Button>
                                )}
                            </div>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFile}
                            />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="profile-first">
                                    {t("pages.register.firstName")}
                                </Label>
                                <Input
                                    id="profile-first"
                                    value={firstName}
                                    onChange={(e) =>
                                        setFirstName(e.target.value)
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="profile-last">
                                    {t("pages.register.lastName")}
                                </Label>
                                <Input
                                    id="profile-last"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleSave}
                                disabled={updateProfile.isPending}
                            >
                                {t("pages.account.save")}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setEditing(false)}
                            >
                                {t("pages.account.cancel")}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <Avatar className="size-14">
                            <AvatarImage
                                src={avatarSrc}
                                className="object-cover"
                            />
                            <AvatarFallback className="text-lg">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="font-heading truncate text-lg font-semibold">
                                {displayName}
                            </p>
                            <p className="text-muted-foreground truncate text-sm">
                                {email}
                            </p>
                        </div>
                        <Badge variant="secondary" className="ml-auto shrink-0">
                            {roleLabel}
                        </Badge>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
