import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";

type RouterFallbackPageProps = {
    badge: string;
    title: string;
    description: string;
};

function RouterFallbackPage({
    badge,
    title,
    description,
}: RouterFallbackPageProps) {
    return (
        <main className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">
                {badge}
            </p>
            <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
            <p className="max-w-md text-muted-foreground">{description}</p>
            <Button asChild className="mt-3">
                <Link to="/">Retour à l'accueil</Link>
            </Button>
        </main>
    );
}

export function NotFoundPage() {
    return (
        <RouterFallbackPage
            badge="Erreur 404"
            title="Page introuvable"
            description="La page demandée n'existe pas ou a été déplacée."
        />
    );
}

export function RouterErrorPage() {
    return (
        <RouterFallbackPage
            badge="Erreur"
            title="Une erreur est survenue"
            description="Un problème inattendu a interrompu l'affichage de cette page. Veuillez réessayer ou revenir à l'accueil."
        />
    );
}
