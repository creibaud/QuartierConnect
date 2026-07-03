package fr.quartierconnect.desktopapp.views.incidents;

import fr.quartierconnect.desktopapp.database.IncidentRepository;
import fr.quartierconnect.desktopapp.i18n.I18n;
import fr.quartierconnect.desktopapp.ui.components.AppBadge;
import fr.quartierconnect.desktopapp.ui.components.AppButton;
import fr.quartierconnect.desktopapp.ui.components.AppModal;
import fr.quartierconnect.desktopapp.ui.components.ToastManager;
import fr.quartierconnect.desktopapp.util.UiHelper;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Label;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Region;
import javafx.scene.layout.VBox;

import java.util.function.BiConsumer;

public class IncidentDetailPane {

    private final AppModal                                          appModal;
    private final ToastManager                                     toast;
    private final IncidentRepository                               repo;
    private final BiConsumer<IncidentRepository.Incident, String>  statusChanger;
    private final Runnable                                         onSaved;

    public IncidentDetailPane(AppModal appModal, ToastManager toast, IncidentRepository repo,
                              BiConsumer<IncidentRepository.Incident, String> statusChanger, Runnable onSaved) {
        this.appModal      = appModal;
        this.toast         = toast;
        this.repo          = repo;
        this.statusChanger = statusChanger;
        this.onSaved       = onSaved;
    }

    public void open(IncidentRepository.Incident item) {
        Label titleSec = new Label(I18n.get("incidents.detail.titleSection"));
        titleSec.getStyleClass().add("detail-card-title");
        VBox.setMargin(titleSec, new Insets(10, 0, 8, 0));
        TextField titleField = new TextField(item.title() != null ? item.title() : "");

        Label statusSec = new Label(I18n.get("incidents.detail.statusSection"));
        statusSec.getStyleClass().add("detail-card-title");
        VBox.setMargin(statusSec, new Insets(18, 0, 8, 0));

        AppBadge statusBadge = AppBadge.fromStatus(item.status());
        VBox.setMargin(statusBadge, new Insets(0, 0, 8, 0));

        HBox statusActions = new HBox(6);
        statusActions.setAlignment(Pos.CENTER_LEFT);
        switch (item.status()) {
            case "open" -> {
                AppButton btn = new AppButton(I18n.get("incidents.detail.toInProgress"), AppButton.Variant.SECONDARY);
                btn.setOnAction(e -> { statusChanger.accept(item, "in_progress"); appModal.hide(); });
                AppButton btn2 = new AppButton(I18n.get("incidents.detail.toResolved"), AppButton.Variant.SECONDARY);
                btn2.setOnAction(e -> { statusChanger.accept(item, "resolved"); appModal.hide(); });
                statusActions.getChildren().addAll(btn, btn2);
            }
            case "in_progress" -> {
                AppButton btn = new AppButton(I18n.get("incidents.detail.toResolved"), AppButton.Variant.SECONDARY);
                btn.setOnAction(e -> { statusChanger.accept(item, "resolved"); appModal.hide(); });
                AppButton btn2 = new AppButton(I18n.get("incidents.detail.reopen"), AppButton.Variant.SECONDARY);
                btn2.setOnAction(e -> { statusChanger.accept(item, "open"); appModal.hide(); });
                statusActions.getChildren().addAll(btn, btn2);
            }
            default -> {
                AppButton btn = new AppButton(I18n.get("incidents.detail.reopen"), AppButton.Variant.SECONDARY);
                btn.setOnAction(e -> { statusChanger.accept(item, "open"); appModal.hide(); });
                statusActions.getChildren().add(btn);
            }
        }

        Region divider = UiHelper.separator();
        VBox.setMargin(divider, new Insets(16, 0, 16, 0));

        Label descSec = new Label(I18n.get("incidents.detail.descSection"));
        descSec.getStyleClass().add("detail-card-title");
        VBox.setMargin(descSec, new Insets(0, 0, 8, 0));
        TextArea descField = new TextArea(item.description() != null ? item.description() : "");
        descField.setWrapText(true);
        descField.setPrefRowCount(4);

        Label syncInfo = new Label(buildSyncInfoText(item));
        syncInfo.getStyleClass().add("content-subtitle");
        VBox.setMargin(syncInfo, new Insets(14, 0, 0, 0));

        AppButton saveBtn  = new AppButton(I18n.get("incidents.detail.save"), AppButton.Variant.PRIMARY);
        AppButton closeBtn = new AppButton(I18n.get("incidents.detail.close"), AppButton.Variant.GHOST);
        closeBtn.setOnAction(e -> appModal.hide());

        saveBtn.setOnAction(e -> {
            String t = titleField.getText().trim();
            if (t.isEmpty()) { toast.showError(I18n.get("incidents.detail.titleRequired")); return; }
            if (t.length() > 200) { toast.showError(I18n.get("incidents.detail.titleTooLong")); return; }
            if (descField.getText().trim().length() > 2000) { toast.showError(I18n.get("incidents.detail.descTooLong")); return; }
            new Thread(() -> {
                try {
                    repo.updateLocally(item.localId(), t, descField.getText().trim(), item.status());
                    Platform.runLater(() -> {
                        onSaved.run();
                        toast.showSuccess(I18n.get("incidents.detail.saved")); appModal.hide();
                    });
                } catch (Exception ex) {
                    Platform.runLater(() -> toast.showError(I18n.get("incidents.error", ex.getMessage())));
                }
            }, "incident-save").start();
        });

        HBox buttons = new HBox(8, saveBtn, closeBtn);
        buttons.setAlignment(Pos.CENTER_RIGHT);
        VBox.setMargin(buttons, new Insets(16, 0, 0, 0));

        VBox content = new VBox(0,
            titleSec, titleField,
            statusSec, statusBadge, statusActions,
            divider, descSec, descField,
            syncInfo, buttons
        );
        content.getStyleClass().add("edit-form-content");
        appModal.show(I18n.get("incidents.detail.modalTitle", item.title()), content);
    }

    private String buildSyncInfoText(IncidentRepository.Incident item) {
        StringBuilder sb = new StringBuilder();
        sb.append(item.isDirty()    ? I18n.get("incidents.syncInfo.pending") : I18n.get("incidents.syncInfo.synced"));
        if (item.isConflict()) sb.append(" ").append(I18n.get("incidents.syncInfo.conflict"));
        if (item.remoteId() != null) sb.append(" ").append(I18n.get("incidents.syncInfo.remote",
                item.remoteId().substring(0, Math.min(8, item.remoteId().length()))));
        return sb.toString();
    }
}
