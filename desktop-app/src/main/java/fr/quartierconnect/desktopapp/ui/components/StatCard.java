package fr.quartierconnect.desktopapp.ui.components;

import javafx.scene.control.Label;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.layout.VBox;

public class StatCard extends VBox {

    private final Label valueLabel;

    public enum Accent { PURPLE, MUTED, AMBER, BLUE, RED }

    public StatCard(String labelText) {
        this(labelText, Accent.MUTED);
    }

    public StatCard(String labelText, Accent accent) {
        getStyleClass().add("card");
        setMaxWidth(Double.MAX_VALUE);
        setSpacing(6);
        HBox.setHgrow(this, Priority.ALWAYS);

        Label label = new Label(labelText);
        label.getStyleClass().add("card-label");

        valueLabel = new Label("—");
        valueLabel.getStyleClass().add("card-value");

        Region accentBar = new Region();
        accentBar.setPrefHeight(3);
        accentBar.setMaxWidth(Double.MAX_VALUE);
        String color = switch (accent) {
            case PURPLE -> "#6d28d9";
            case AMBER  -> "#b45309";
            case BLUE   -> "#2563eb";
            case RED    -> "#dc2626";
            case MUTED  -> "#a1a1aa";
        };
        accentBar.setStyle("-fx-background-color: " + color + "; -fx-background-radius: 0 0 7 7;");

        VBox.setVgrow(new Region(), Priority.ALWAYS);

        getChildren().addAll(label, valueLabel, buildSpacer(), accentBar);
    }

    public void setValue(String value) {
        valueLabel.setText(value);
    }

    private Region buildSpacer() {
        Region spacer = new Region();
        VBox.setVgrow(spacer, Priority.ALWAYS);
        return spacer;
    }
}
