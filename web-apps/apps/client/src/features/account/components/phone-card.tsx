import { useState, type FormEvent } from "react";
import { PencilEdit02Icon, SmartPhone01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useChangePhone, useMyProfile } from "@workspace/shared/lib/hooks/useMe";
import { isValidPhone, normalizePhone } from "@workspace/shared/lib/phone";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
    TOTP_LENGTH,
    TotpCodeField,
} from "@/features/account/components/totp-code-field";

export function PhoneCard() {
    const { t } = useTranslation();
    const { data: profile } = useMyProfile();
    const changePhone = useChangePhone();

    const [open, setOpen] = useState(false);
    const [phone, setPhone] = useState("");
    const [totpCode, setTotpCode] = useState("");

    const currentPhone = profile?.phone ?? null;
    const trimmedPhone = phone.trim();
    const phoneInvalid = trimmedPhone !== "" && !isValidPhone(trimmedPhone);

    function handleOpenChange(nextOpen: boolean) {
        setOpen(nextOpen);
        setPhone(nextOpen ? (currentPhone ?? "") : "");
        setTotpCode("");
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        changePhone.mutate(
            {
                phone: trimmedPhone ? normalizePhone(trimmedPhone) : null,
                totpCode,
            },
            {
                onSuccess: () => {
                    setOpen(false);
                    setTotpCode("");
                    toast.success(t("pages.account.phoneUpdated"));
                },
                onError: () => {
                    toast.error(t("auth.errors.invalidTotpCheckApp"));
                    setTotpCode("");
                },
            },
        );
    }

    const submitDisabled =
        changePhone.isPending ||
        phoneInvalid ||
        totpCode.length !== TOTP_LENGTH;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <HugeiconsIcon
                        icon={SmartPhone01Icon}
                        className="text-primary size-5"
                    />
                    {t("pages.account.phoneCardTitle")}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                            {currentPhone ?? t("pages.account.phoneNotSet")}
                        </p>
                        <p className="text-muted-foreground text-sm">
                            {t("pages.account.phoneDescription")}
                        </p>
                    </div>
                    <Dialog open={open} onOpenChange={handleOpenChange}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="shrink-0">
                                <HugeiconsIcon
                                    icon={PencilEdit02Icon}
                                    className="size-4"
                                />
                                {t("pages.account.edit")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <DialogHeader>
                                    <DialogTitle>
                                        {t("pages.account.changePhone")}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {t(
                                            "pages.account.phoneChangeDescription",
                                        )}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-2">
                                    <Label htmlFor="phone-number">
                                        {t("pages.account.phoneLabel")}
                                    </Label>
                                    <Input
                                        id="phone-number"
                                        type="tel"
                                        autoComplete="tel"
                                        value={phone}
                                        onChange={(e) =>
                                            setPhone(e.target.value)
                                        }
                                        placeholder="+33612345678"
                                        aria-invalid={phoneInvalid}
                                    />
                                    {phoneInvalid && (
                                        <p
                                            role="alert"
                                            className="text-destructive text-sm"
                                        >
                                            {t("auth.validation.phoneInvalid")}
                                        </p>
                                    )}
                                </div>
                                <TotpCodeField
                                    label={t(
                                        "pages.account.totpVerificationLabel",
                                    )}
                                    value={totpCode}
                                    onChange={setTotpCode}
                                />
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button type="button" variant="outline">
                                            {t("pages.account.cancel")}
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        type="submit"
                                        disabled={submitDisabled}
                                    >
                                        {t("pages.account.save")}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    );
}
