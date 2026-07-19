import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

const titles: Record<string, string> = {
  fr: 'Documentation Développeur',
  en: 'Developer Documentation',
};

export function baseOptions(locale: string): BaseLayoutProps {
  return {
    nav: {
      title: titles[locale] ?? titles.fr,
      url: `/${locale}`,
    },
  };
}
