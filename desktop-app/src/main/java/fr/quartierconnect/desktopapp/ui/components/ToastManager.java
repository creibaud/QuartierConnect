package fr.quartierconnect.desktopapp.ui.components;

import javafx.animation.KeyFrame;
import javafx.animation.KeyValue;
import javafx.animation.Timeline;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Label;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.util.Duration;

import java.util.ArrayDeque;
import java.util.Deque;

public class ToastManager {

    private static final int MAX_VISIBLE = 2;
    private static final double SUCCESS_DURATION_S = 3.0;
    private static final double ERROR_DURATION_S = 6.0;

    public enum Type { SUCCESS, ERROR, INFO }

    private final StackPane overlay;
    private final VBox toastContainer;
    private final Deque<ToastItem> queue = new ArrayDeque<>();

    private record ToastItem(String message, Type type) {}

    public ToastManager(StackPane rootPane) {
        this.toastContainer = new VBox(8);
        toastContainer.setAlignment(Pos.TOP_RIGHT);
        toastContainer.setPadding(new Insets(62, 12, 0, 0));
        toastContainer.setPickOnBounds(false);
        toastContainer.setMaxWidth(Double.MAX_VALUE);
        toastContainer.setMaxHeight(Double.MAX_VALUE);

        this.overlay = new StackPane(toastContainer);
        overlay.setAlignment(Pos.TOP_RIGHT);
        overlay.setPickOnBounds(false);
        overlay.setMouseTransparent(true);

        rootPane.getChildren().add(overlay);
    }

    public void showSuccess(String message) {
        show(message, Type.SUCCESS);
    }

    public void showError(String message) {
        show(message, Type.ERROR);
    }

    public void showInfo(String message) {
        show(message, Type.INFO);
    }

    private void show(String message, Type type) {
        Platform.runLater(() -> {
            if (toastContainer.getChildren().size() >= MAX_VISIBLE) {
                if (!toastContainer.getChildren().isEmpty()) {
                    toastContainer.getChildren().remove(0);
                }
            }
            addToast(message, type);
        });
    }

    private void addToast(String message, Type type) {
        Label lbl = new Label(message);
        lbl.setWrapText(true);
        lbl.setMaxWidth(280);

        VBox toast = new VBox(lbl);
        toast.setPadding(new Insets(12, 16, 12, 16));
        toast.getStyleClass().add("toast");
        toast.getStyleClass().add(switch (type) {
            case SUCCESS -> "toast-success";
            case ERROR -> "toast-error";
            case INFO -> "toast-info";
        });

        toast.setTranslateX(320);
        toast.setOpacity(0);
        toastContainer.getChildren().add(toast);

        Timeline slideIn = new Timeline(
                new KeyFrame(Duration.millis(300),
                        new KeyValue(toast.translateXProperty(), 0),
                        new KeyValue(toast.opacityProperty(), 1.0))
        );
        slideIn.play();

        double displaySeconds = (type == Type.ERROR) ? ERROR_DURATION_S : SUCCESS_DURATION_S;

        Timeline dismiss = new Timeline(
                new KeyFrame(Duration.seconds(displaySeconds),
                        e -> dismissToast(toast))
        );
        dismiss.play();
    }

    private void dismissToast(VBox toast) {
        Timeline slideOut = new Timeline(
                new KeyFrame(Duration.millis(250),
                        new KeyValue(toast.translateXProperty(), 320),
                        new KeyValue(toast.opacityProperty(), 0))
        );
        slideOut.setOnFinished(e -> toastContainer.getChildren().remove(toast));
        slideOut.play();
    }
}
