import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import { lazy } from 'react';
import './global.css';

const StaticSearchDialog = lazy(() => import('@/components/search'));

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider search={{ SearchDialog: StaticSearchDialog }}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
