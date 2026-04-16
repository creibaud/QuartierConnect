package fr.quartierconnect.desktopapp.ui.components;

import atlantafx.base.controls.ModalPane;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;

/**
 * Wrapper around AtlantaFX ModalPane that provides clean, styled overlay dialogs.
 * The modal is anchored to the root StackPane — no separate Stage, no OS chrome.
 */
public class AppModal {

    private final ModalPane modalPane;

    public AppModal(ModalPane modalPane) {
        this.modalPane = modalPane;
        modalPane.setPersistent(false);
    }

    public void show(String title, Node content) {
        show(title, content, 520, 420);
    }

    public void showWide(String title, Node content) {
        show(title, content, 720, 620);
    }

    private void show(String title, Node content, double maxW, double minW) {
        Label titleLabel = new Label(title);
        titleLabel.getStyleClass().add("modal-title");

        Button closeBtn = new Button("✕");
        closeBtn.getStyleClass().addAll("button", "flat", "modal-close-btn");
        closeBtn.setOnAction(e -> hide());

        HBox header = new HBox(titleLabel, closeBtn);
        HBox.setHgrow(titleLabel, Priority.ALWAYS);
        header.setAlignment(Pos.CENTER_LEFT);
        header.getStyleClass().add("modal-header");
        header.setPadding(new Insets(16, 16, 16, 20));

        javafx.scene.layout.VBox contentArea = new javafx.scene.layout.VBox(content);
        contentArea.setPadding(new Insets(16, 20, 20, 20));

        VBox dialog = new VBox(header, contentArea);
        dialog.getStyleClass().add("app-modal-box");
        dialog.setMaxWidth(maxW);
        dialog.setMinWidth(minW);
        dialog.setMaxHeight(javafx.scene.layout.Region.USE_PREF_SIZE);
        javafx.scene.layout.StackPane.setAlignment(dialog, javafx.geometry.Pos.CENTER);

        modalPane.show(dialog);
    }

    public void hide() {
        modalPane.hide(true);
    }
}
