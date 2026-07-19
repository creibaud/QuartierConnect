import { defineI18n } from 'fumadocs-core/i18n';
import { uiTranslations } from 'fumadocs-ui/i18n';

export const i18n = defineI18n({
  languages: ['fr', 'en'],
  defaultLanguage: 'fr',
  hideLocale: 'never',
});

export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add({
    fr: {
      displayName: 'Français',
      'Back to Home(404 page)': "Retour à l'accueil",
      'Choose a language(language switcher)': 'Choisir une langue',
      'Choose a language(language switcher)(aria-label)': 'Choisir une langue',
      'Close Banner(banner)(aria-label)': 'Fermer la bannière',
      'Close Search(search dialog)(aria-label)': 'Fermer la recherche',
      'Collapse Sidebar(sidebar)(aria-label)': 'Réduire la barre latérale',
      'Copied Text(code block)(aria-label)': 'Texte copié',
      'Copy Anchor Link(heading anchor)(aria-label)': "Copier le lien d'ancrage",
      'Copy Link(accordion)(aria-label)': 'Copier le lien',
      'Copy Markdown(page actions)': 'Copier le Markdown',
      'Copy Text(code block)(aria-label)': 'Copier le texte',
      'Dark(theme switcher)(aria-label)': 'Sombre',
      'Default(type table)': 'Valeur par défaut',
      'Edit on GitHub(edit page)': 'Modifier sur GitHub',
      'Last updated on(page footer)': 'Dernière mise à jour le',
      'Light(theme switcher)(aria-label)': 'Clair',
      'Next Page(pagination)': 'Page suivante',
      'No Headings(table of contents)': 'Aucun titre',
      'No results found(search dialog)': 'Aucun résultat',
      'On this page(table of contents)': 'Sur cette page',
      'Open Search(search trigger)(aria-label)': 'Ouvrir la recherche',
      'Open Sidebar(sidebar)(aria-label)': 'Ouvrir la barre latérale',
      'Open in ChatGPT(page actions)': 'Ouvrir dans ChatGPT',
      'Open in Claude(page actions)': 'Ouvrir dans Claude',
      'Open in Cursor(page actions)': 'Ouvrir dans Cursor',
      'Open in GitHub(page actions)': 'Ouvrir dans GitHub',
      'Open in Scira AI(page actions)': 'Ouvrir dans Scira AI',
      'Open(page actions)': 'Ouvrir',
      'Page Not Found(404 page)': 'Page introuvable',
      'Parameters(type table)': 'Paramètres',
      'Previous Page(pagination)': 'Page précédente',
      'Prop(type table)': 'Propriété',
      'Read {url}, I want to ask questions about it.(page actions)':
        "Consulte {url}, j'ai des questions à son sujet.",
      'Returns(type table)': 'Retour',
      'Search(search dialog)': 'Rechercher',
      'Search(search trigger)': 'Rechercher',
      'System(theme switcher)(aria-label)': 'Système',
      'Table of Contents(inline table of contents)': 'Sommaire',
      'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.(404 page)':
        'La page que vous recherchez a peut-être été supprimée, renommée, ou est temporairement indisponible.',
      'Toggle Menu(mobile menu)(aria-label)': 'Afficher ou masquer le menu',
      'Toggle Theme(theme switcher)(aria-label)': 'Changer de thème',
      'Type(type table)': 'Type',
      'View as Markdown(page actions)': 'Voir en Markdown',
    },
    en: {
      displayName: 'English',
    },
  });
