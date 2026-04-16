package fr.quartierconnect.desktopapp.ui.components;

import javafx.geometry.Insets;
import javafx.scene.Node;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;

public class AppCard extends VBox {

    public AppCard() {
        getStyleClass().add("card");
        setMaxWidth(Double.MAX_VALUE);
        HBox.setHgrow(this, Priority.ALWAYS);
    }

    public AppCard(Node... children) {
        this();
        getChildren().addAll(children);
    }

    public AppCard withSpacing(double spacing) {
        setSpacing(spacing);
        return this;
    }

    public AppCard withPadding(Insets insets) {
        setPadding(insets);
        return this;
    }

    public static AppCard hoverable() {
        AppCard card = new AppCard();
        card.getStyleClass().add("quick-action-card");
        return card;
    }
}
