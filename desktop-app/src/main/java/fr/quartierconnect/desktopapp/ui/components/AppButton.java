package fr.quartierconnect.desktopapp.ui.components;

import atlantafx.base.theme.Styles;
import javafx.scene.Cursor;
import javafx.scene.control.Button;

public class AppButton extends Button {

    public enum Variant { PRIMARY, SECONDARY, GHOST, DESTRUCTIVE }

    public AppButton(String text, Variant variant) {
        super(text);
        setCursor(Cursor.HAND);
        switch (variant) {
            case PRIMARY     -> getStyleClass().add(Styles.ACCENT);
            case SECONDARY   -> getStyleClass().add(Styles.BUTTON_OUTLINED);
            case GHOST       -> getStyleClass().addAll(Styles.FLAT, Styles.TEXT_MUTED);
            case DESTRUCTIVE -> getStyleClass().addAll(Styles.BUTTON_OUTLINED, Styles.DANGER);
        }
    }

    public AppButton(String text, Variant variant, boolean fullWidth) {
        this(text, variant);
        if (fullWidth) setMaxWidth(Double.MAX_VALUE);
    }
}
