import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/hero";

export const Route = createFileRoute("/$locale/_authenticated/")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <div>
            <Hero />
        </div>
    );
}
