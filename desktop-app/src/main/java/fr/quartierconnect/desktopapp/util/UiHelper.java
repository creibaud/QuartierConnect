package fr.quartierconnect.desktopapp.util;

import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Label;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import org.kordamp.ikonli.Ikon;
import org.kordamp.ikonli.javafx.FontIcon;

public final class UiHelper {

    private UiHelper() {}

    public static FontIcon icon(Ikon code, int size) {
        FontIcon fi = new FontIcon(code);
        fi.setIconSize(size);
        return fi;
    }

    public static HBox detailRow(Label label, Label value) {
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        HBox row = new HBox(label, spacer, value);
        row.setAlignment(Pos.CENTER_LEFT);
        row.setPadding(new Insets(7, 0, 7, 0));
        return row;
    }

    public static Region separator() {
        Region sep = new Region();
        sep.getStyleClass().add("detail-row-sep");
        sep.setMaxWidth(Double.MAX_VALUE);
        sep.setPrefHeight(1);
        return sep;
    }

    public static String formatIsoDate(String iso) {
        if (iso == null || iso.isBlank()) return "\u2014";
        try {
            String[] p = iso.split("T");
            if (p.length < 2) return iso;
            String[] d = p[0].split("-");
            String[] t = p[1].split(":");
            return d.length >= 3 && t.length >= 2
                ? d[2] + "/" + d[1] + " " + t[0] + ":" + t[1]
                : iso;
        } catch (Exception e) { return iso; }
    }
}
