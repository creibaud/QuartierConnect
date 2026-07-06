package fr.quartierconnect.desktopapp.ui.components;

import fr.quartierconnect.desktopapp.i18n.I18n;
import fr.quartierconnect.desktopapp.util.UiHelper;
import javafx.scene.control.Label;
import org.kordamp.ikonli.fontawesome5.FontAwesomeSolid;

public class AppBadge extends Label {

    public enum Variant {
        OPEN("badge-open"),
        IN_PROGRESS("badge-in-progress"),
        RESOLVED("badge-resolved"),
        DIRTY("badge-dirty"),
        CONFLICT("badge-conflict"),
        NEUTRAL("badge-neutral");

        private final String cssClass;

        Variant(String cssClass) {
            this.cssClass = cssClass;
        }

        public String getCssClass() {
            return cssClass;
        }
    }

    public AppBadge(String text, Variant variant) {
        super(text);
        getStyleClass().addAll("badge", variant.getCssClass());
    }

    public static AppBadge fromStatus(String status) {
        return switch (status == null ? "" : status) {
            case "in_progress" -> withIcon(I18n.get("badge.status.inProgress"), Variant.IN_PROGRESS, FontAwesomeSolid.SPINNER);
            case "resolved"    -> withIcon(I18n.get("badge.status.resolved"),   Variant.RESOLVED,    FontAwesomeSolid.CHECK_CIRCLE);
            default            -> withIcon(I18n.get("badge.status.open"),        Variant.OPEN,        FontAwesomeSolid.CIRCLE);
        };
    }

    private static AppBadge withIcon(String text, Variant variant, FontAwesomeSolid iconCode) {
        AppBadge badge = new AppBadge(text, variant);
        badge.setGraphic(UiHelper.icon(iconCode, 9));
        badge.setGraphicTextGap(4);
        return badge;
    }
}
