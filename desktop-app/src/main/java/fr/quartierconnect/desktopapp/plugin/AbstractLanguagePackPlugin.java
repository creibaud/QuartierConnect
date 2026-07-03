package fr.quartierconnect.desktopapp.plugin;

import fr.quartierconnect.desktopapp.i18n.I18n;

/**
 * Classe de base pour les plugins de pack de langue : enregistre le pack auprès de
 * {@link I18n} au chargement et le retire au déchargement. Les sous-classes ne
 * fournissent que l'identité, la locale et le bundle.
 */
public abstract class AbstractLanguagePackPlugin implements LanguagePackPlugin {

    @Override
    public void onLoad() {
        I18n.registerLanguagePack(locale(), bundle());
    }

    @Override
    public void onUnload() {
        I18n.unregisterLanguagePack(locale());
    }
}
