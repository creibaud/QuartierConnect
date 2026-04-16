package fr.quartierconnect.desktopapp.ui.components;

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
            case "in_progress" -> withIcon("En cours", Variant.IN_PROGRESS, FontAwesomeSolid.SPINNER);
            case "resolved"    -> withIcon("Résolu",   Variant.RESOLVED,    FontAwesomeSolid.CHECK_CIRCLE);
            default            -> withIcon("Ouvert",   Variant.OPEN,        FontAwesomeSolid.CIRCLE);
        };
    }

    public static AppBadge fromRole(String role) {
        return switch (role == null ? "" : role) {
            case "admin"     -> withIcon("Admin",       Variant.CONFLICT,    FontAwesomeSolid.SHIELD_ALT);
            case "moderator" -> withIcon("Modérateur",  Variant.IN_PROGRESS, FontAwesomeSolid.USER_SHIELD);
            default          -> withIcon("Utilisateur", Variant.NEUTRAL,     FontAwesomeSolid.USER);
        };
    }

    public static AppBadge fromContractStatus(String status) {
        return switch (status == null ? "" : status) {
            case "partial"      -> withIcon("Partiel",   Variant.IN_PROGRESS, FontAwesomeSolid.PEN_FANCY);
            case "fully_signed" -> withIcon("Signé",     Variant.RESOLVED,    FontAwesomeSolid.FILE_SIGNATURE);
            default             -> withIcon("Brouillon", Variant.NEUTRAL,     FontAwesomeSolid.FILE_ALT);
        };
    }

    private static AppBadge withIcon(String text, Variant variant, FontAwesomeSolid iconCode) {
        AppBadge badge = new AppBadge(text, variant);
        badge.setGraphic(UiHelper.icon(iconCode, 9));
        badge.setGraphicTextGap(4);
        return badge;
    }
}
