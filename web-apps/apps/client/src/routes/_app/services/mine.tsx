import { createFileRoute } from "@tanstack/react-router";
import { MyServicesPage } from "@/features/services/pages/my-services-page";

export const Route = createFileRoute("/_app/services/mine")({
    component: MyServicesPage,
});
