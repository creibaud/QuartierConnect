import Link from 'next/link';
import './global.css';

// This route sits outside [lang], which is where the html/body wrapper lives,
// so it carries its own.
export default function NotFound() {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-fd-muted-foreground text-sm font-medium">404</p>
        <h1 className="text-2xl font-semibold">Page introuvable</h1>
        <p className="text-fd-muted-foreground max-w-prose">
          Cette page a peut-être été déplacée ou renommée.
        </p>
        <Link
          href="/fr"
          className="bg-fd-primary text-fd-primary-foreground rounded-lg px-4 py-2 text-sm font-medium"
        >
          Retour à la documentation
        </Link>
      </body>
    </html>
  );
}
