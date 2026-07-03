package fr.quartierconnect.desktopapp.views.incidents;

import fr.quartierconnect.desktopapp.database.IncidentRepository;
import fr.quartierconnect.desktopapp.i18n.I18n;
import fr.quartierconnect.desktopapp.ui.components.AppButton;
import fr.quartierconnect.desktopapp.ui.components.AppModal;
import fr.quartierconnect.desktopapp.ui.components.ToastManager;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Label;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;

import java.sql.SQLException;

public class IncidentCreateForm {

    private final AppModal           appModal;
    private final ToastManager       toast;
    private final IncidentRepository repo;
    private final Runnable           onCreated;

    public IncidentCreateForm(AppModal appModal, ToastManager toast, IncidentRepository repo, Runnable onCreated) {
        this.appModal  = appModal;
        this.toast     = toast;
        this.repo      = repo;
        this.onCreated = onCreated;
    }

    public void open() {
        Label titleLbl = new Label(I18n.get("incidents.form.titleLabel"));
        titleLbl.getStyleClass().add("detail-card-title");
        VBox.setMargin(titleLbl, new Insets(6, 0, 8, 0));
        TextField titleField = new TextField();
        titleField.setPromptText(I18n.get("incidents.form.titlePrompt"));

        Label descLbl = new Label(I18n.get("incidents.form.descLabel"));
        descLbl.getStyleClass().add("detail-card-title");
        VBox.setMargin(descLbl, new Insets(16, 0, 8, 0));
        TextArea descField = new TextArea();
        descField.setPromptText(I18n.get("incidents.form.descPrompt"));
        descField.setPrefRowCount(4);
        descField.setWrapText(true);

        Label errorMsg = new Label();
        errorMsg.getStyleClass().add("error-label");
        errorMsg.setVisible(false);
        errorMsg.setManaged(false);

        Label infoNote = new Label(I18n.get("incidents.form.savedNote"));
        infoNote.getStyleClass().add("content-subtitle");
        VBox.setMargin(infoNote, new Insets(10, 0, 0, 0));

        AppButton submitBtn = new AppButton(I18n.get("incidents.form.create"), AppButton.Variant.PRIMARY);
        AppButton cancelBtn = new AppButton(I18n.get("incidents.form.cancel"), AppButton.Variant.GHOST);
        cancelBtn.setOnAction(e -> appModal.hide());

        submitBtn.setOnAction(e -> {
            String t = titleField.getText().trim();
            if (t.isEmpty()) {
                errorMsg.setText(I18n.get("incidents.form.titleRequired"));
                errorMsg.setVisible(true); errorMsg.setManaged(true);
                return;
            }
            if (t.length() > 200) {
                errorMsg.setText(I18n.get("incidents.form.titleTooLong"));
                errorMsg.setVisible(true); errorMsg.setManaged(true);
                return;
            }
            if (descField.getText().trim().length() > 2000) {
                errorMsg.setText(I18n.get("incidents.form.descTooLong"));
                errorMsg.setVisible(true); errorMsg.setManaged(true);
                return;
            }
            try {
                repo.insertDirty(t, descField.getText().trim());
                appModal.hide(); onCreated.run();
                toast.showSuccess(I18n.get("incidents.created"));
            } catch (SQLException ex) {
                errorMsg.setText(I18n.get("incidents.form.retryError"));
                errorMsg.setVisible(true); errorMsg.setManaged(true);
            }
        });

        HBox buttons = new HBox(8, submitBtn, cancelBtn);
        buttons.setAlignment(Pos.CENTER_RIGHT);
        VBox.setMargin(buttons, new Insets(14, 0, 0, 0));

        VBox content = new VBox(0,
            titleLbl, titleField, errorMsg,
            descLbl, descField,
            infoNote, buttons
        );
        content.getStyleClass().add("edit-form-content");
        appModal.show(I18n.get("incidents.new"), content);
    }
}
