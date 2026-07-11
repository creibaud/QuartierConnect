import { createFileRoute } from "@tanstack/react-router";
import { DslPage } from "@/features/dsl";

export const Route = createFileRoute("/_app/dsl/")({
    component: DslPage,
});
