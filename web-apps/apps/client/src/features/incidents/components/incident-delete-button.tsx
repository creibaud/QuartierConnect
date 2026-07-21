import { useTranslation } from "react-i18next";
import { Delete01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import { useDeleteIncident } from "@workspace/shared/lib/hooks/incidents.hooks";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";

export function IncidentDeleteButton({ id }: { id: string }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = getCurrentUser();
    const deleteIncident = useDeleteIncident();

    const canDelete = user?.role === "moderator" || user?.role === "admin";
    if (!canDelete) return null;

    function handleDelete() {
        deleteIncident.mutate(id, {
            onSuccess: () => {
                toast.success(t("pages.incidentDetail.deleteSuccess"));
                void navigate({ to: "/incidents" });
            },
            onError: () => toast.error(t("pages.incidentDetail.deleteError")),
        });
    }

    return (
        <div className="border-t pt-4">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                        variant="destructive"
                        disabled={deleteIncident.isPending}
                    >
                        <HugeiconsIcon icon={Delete01Icon} />
                        {t("pages.incidentDetail.delete")}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t("pages.incidentDetail.deleteConfirmTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("pages.incidentDetail.deleteConfirmDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {t("common.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={handleDelete}
                        >
                            {t("common.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
