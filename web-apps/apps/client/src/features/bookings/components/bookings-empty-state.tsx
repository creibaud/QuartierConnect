import { useTranslation } from "react-i18next";
import { Calendar02Icon } from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { EmptyState } from "@workspace/ui/components/empty-state";

export function BookingsEmptyState({ message }: { message: string }) {
    const { t } = useTranslation();
    return (
        <EmptyState
            icon={Calendar02Icon}
            title={t("bookings.emptyState.title")}
            description={message}
            action={
                <Button asChild>
                    <Link to="/services">
                        {t("bookings.emptyState.browseServices")}
                    </Link>
                </Button>
            }
        />
    );
}
