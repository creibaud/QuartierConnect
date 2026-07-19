import { RootProvider } from 'fumadocs-ui/provider/next';
import { i18nProvider } from 'fumadocs-ui/i18n';
import { lazy } from 'react';
import { i18n, translations } from '@/lib/i18n';

const StaticSearchDialog = lazy(() => import('@/components/search'));

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}

export default async function Layout({
  children,
  params,
}: LayoutProps<'/[lang]'>) {
  const { lang } = await params;

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider
          i18n={i18nProvider(translations, lang)}
          search={{ SearchDialog: StaticSearchDialog }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
