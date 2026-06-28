package fr.quartierconnect.desktopapp.plugin;

import fr.quartierconnect.desktopapp.i18n.I18n;

/**
 * Base class for language-pack plugins: registers the pack with {@link I18n} on
 * load and removes it on unload. Subclasses only provide identity, locale and
 * bundle.
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
