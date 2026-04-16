package fr.quartierconnect.desktopapp.ui.components;

import javafx.geometry.Pos;
import javafx.scene.control.Label;
import javafx.scene.layout.VBox;

public class EmptyState extends VBox {

    public EmptyState(String message) {
        setAlignment(Pos.CENTER);
        setSpacing(8);

        Label lbl = new Label(message);
        lbl.getStyleClass().add("muted-label");
        lbl.setWrapText(true);
        lbl.setTextAlignment(javafx.scene.text.TextAlignment.CENTER);

        getChildren().add(lbl);
    }

    public EmptyState(String message, String hint) {
        this(message);

        Label hintLbl = new Label(hint);
        hintLbl.getStyleClass().add("caption");
        hintLbl.setWrapText(true);
        hintLbl.setTextAlignment(javafx.scene.text.TextAlignment.CENTER);

        getChildren().add(hintLbl);
    }
}
