import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

const titles: Record<string, string> = {
  fr: 'Aide QuartierConnect',
  en: 'QuartierConnect Help',
};

export function baseOptions(locale: string): BaseLayoutProps {
  return {
    nav: {
      title: titles[locale] ?? titles.fr,
      url: `/${locale}`,
    },
  };
}
