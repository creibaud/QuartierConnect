package fr.quartierconnect.desktopapp.ui.components;

import javafx.animation.Animation;
import javafx.animation.KeyFrame;
import javafx.animation.KeyValue;
import javafx.animation.Timeline;
import javafx.scene.layout.VBox;
import javafx.scene.shape.Rectangle;
import javafx.util.Duration;

public class SkeletonLoader extends VBox {

    private final Timeline pulseTimeline;

    private SkeletonLoader(int rows, double width) {
        setSpacing(12);
        setStyle("-fx-padding: 0;");

        for (int i = 0; i < rows; i++) {
            VBox card = buildSkeletonCard();
            getChildren().add(card);
        }

        pulseTimeline = buildPulse();
        pulseTimeline.play();
    }

    public static SkeletonLoader forList(int rows) {
        return new SkeletonLoader(rows, Double.MAX_VALUE);
    }

    public void stop() {
        pulseTimeline.stop();
    }

    private VBox buildSkeletonCard() {
        Rectangle titleBar = new Rectangle(200, 14);
        titleBar.getStyleClass().add("skeleton-bar");
        titleBar.setArcWidth(6);
        titleBar.setArcHeight(6);

        Rectangle descBar = new Rectangle(320, 12);
        descBar.getStyleClass().add("skeleton-bar");
        descBar.setArcWidth(6);
        descBar.setArcHeight(6);

        Rectangle metaBar = new Rectangle(120, 10);
        metaBar.getStyleClass().add("skeleton-bar");
        metaBar.setArcWidth(6);
        metaBar.setArcHeight(6);

        VBox card = new VBox(8, titleBar, descBar, metaBar);
        card.getStyleClass().add("skeleton-card");
        card.setMaxWidth(Double.MAX_VALUE);
        return card;
    }

    private Timeline buildPulse() {
        Timeline tl = new Timeline(
                new KeyFrame(Duration.ZERO,
                        e -> lookupAll(".skeleton-bar").forEach(n -> n.setOpacity(0.4))),
                new KeyFrame(Duration.millis(800),
                        e -> lookupAll(".skeleton-bar").forEach(n -> n.setOpacity(0.9))),
                new KeyFrame(Duration.millis(1600),
                        e -> lookupAll(".skeleton-bar").forEach(n -> n.setOpacity(0.4)))
        );
        tl.setCycleCount(Animation.INDEFINITE);
        return tl;
    }
}
