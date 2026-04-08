package fr.quartierconnect.desktopapp.views;

import fr.quartierconnect.desktopapp.database.IncidentRepository;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Button;
import javafx.scene.control.Dialog;
import javafx.scene.control.Label;
import javafx.scene.control.ListCell;
import javafx.scene.control.ListView;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;

import java.sql.SQLException;
import java.util.List;

public class IncidentsView {

    private final IncidentRepository repo = new IncidentRepository();
    private final ListView<IncidentRepository.Incident> listView = new ListView<>();
    private final VBox root;

    public IncidentsView() {
        this.root = buildLayout();
        refresh();
    }

    public VBox getRoot() {
        return root;
    }

    public void refresh() {
        try {
            List<IncidentRepository.Incident> incidents = repo.listAll();
            listView.getItems().setAll(incidents);
        } catch (SQLException e) {
            listView.setPlaceholder(new Label("Erreur de chargement."));
        }
    }

    private VBox buildLayout() {
        Label title = new Label("Incidents");
        title.getStyleClass().add("content-title");

        Button reportBtn = new Button("Signaler un incident");
        reportBtn.setOnAction(e -> openCreateDialog());

        HBox header = new HBox(12, title, reportBtn);
        header.setAlignment(Pos.CENTER_LEFT);

        listView.setPlaceholder(new Label("Aucun incident signalé."));
        listView.setCellFactory(lv -> new IncidentCell(this));
        VBox.setVgrow(listView, Priority.ALWAYS);

        VBox layout = new VBox(12, header, listView);
        layout.setPadding(new Insets(20));
        return layout;
    }

    private void openCreateDialog() {
        Dialog<Void> dialog = new Dialog<>();
        dialog.setTitle("Signaler un incident");

        Label titleLabel = new Label("Titre *");
        TextField titleField = new TextField();
        titleField.setPromptText("Ex : Lampadaire cassé rue de la Paix");

        Label descLabel = new Label("Description");
        TextArea descField = new TextArea();
        descField.setPromptText("Décrivez l'incident…");
        descField.setPrefRowCount(3);
        descField.setWrapText(true);

        Button submitBtn = new Button("Signaler");
        Button cancelBtn = new Button("Annuler");
        cancelBtn.setOnAction(e -> dialog.close());

        submitBtn.setOnAction(e -> {
            String titleText = titleField.getText().trim();
            if (titleText.isEmpty()) return;
            try {
                repo.insertDirty(titleText, descField.getText().trim());
                dialog.close();
                refresh();
            } catch (SQLException ex) {
                titleLabel.setText("Erreur — réessayez");
            }
        });

        HBox buttons = new HBox(8, submitBtn, cancelBtn);
        buttons.setAlignment(Pos.CENTER_RIGHT);

        VBox content = new VBox(8, titleLabel, titleField, descLabel, descField, buttons);
        content.setPadding(new Insets(16));
        content.setPrefWidth(400);

        dialog.getDialogPane().setContent(content);
        dialog.showAndWait();
    }

    void openConflictDialog(IncidentRepository.Incident item) {
        Dialog<Void> dialog = new Dialog<>();
        dialog.setTitle("Conflit de synchronisation");

        Label info = new Label("Ce champ a été modifié des deux côtés depuis la dernière synchronisation.");
        info.setWrapText(true);

        Label localHeader  = new Label("Version locale");
        localHeader.setStyle("-fx-font-weight: bold;");
        Label localText = new Label(formatConflictSummary(item.title(), item.description(), item.status()));
        localText.setWrapText(true);

        Label remoteHeader = new Label("Version serveur");
        remoteHeader.setStyle("-fx-font-weight: bold;");
        Label remoteText = new Label(formatConflictSummary(item.remoteTitle(), item.remoteDescription(), item.remoteStatus()));
        remoteText.setWrapText(true);

        Button keepLocalBtn  = new Button("Garder la version locale");
        Button keepRemoteBtn = new Button("Accepter la version serveur");
        Button cancelBtn     = new Button("Plus tard");

        cancelBtn.setOnAction(e -> dialog.close());

        keepLocalBtn.setOnAction(e -> {
            resolveConflict(item.localId(), false);
            dialog.close();
        });

        keepRemoteBtn.setOnAction(e -> {
            resolveConflict(item.localId(), true);
            dialog.close();
        });

        HBox buttons = new HBox(8, keepLocalBtn, keepRemoteBtn, cancelBtn);
        buttons.setAlignment(Pos.CENTER_RIGHT);

        VBox content = new VBox(12,
                info,
                localHeader, localText,
                remoteHeader, remoteText,
                buttons);
        content.setPadding(new Insets(16));
        content.setPrefWidth(480);

        dialog.getDialogPane().setContent(content);
        dialog.showAndWait();
    }

    private void resolveConflict(int localId, boolean acceptRemote) {
        try {
            repo.resolveConflict(localId, acceptRemote);
            refresh();
        } catch (SQLException e) {
            // Non-critical — conflict badge remains until next successful resolve
        }
    }

    private String formatConflictSummary(String title, String description, String status) {
        String statusLabel = switch (status == null ? "" : status) {
            case "in_progress" -> "En cours";
            case "resolved"    -> "Résolu";
            default            -> "Ouvert";
        };
        return "[" + statusLabel + "] " + title +
                (description != null && !description.isBlank() ? "\n" + description : "");
    }

    private static class IncidentCell extends ListCell<IncidentRepository.Incident> {

        private final IncidentsView view;

        IncidentCell(IncidentsView view) {
            this.view = view;
        }

        @Override
        protected void updateItem(IncidentRepository.Incident item, boolean empty) {
            super.updateItem(item, empty);
            if (empty || item == null) {
                setGraphic(null);
                return;
            }

            Label titleLabel = new Label(item.title());
            titleLabel.setStyle("-fx-font-weight: bold;");

            String statusText = switch (item.status()) {
                case "in_progress" -> "En cours";
                case "resolved"    -> "Résolu";
                default            -> "Ouvert";
            };
            Label statusLabel = new Label(statusText);
            statusLabel.setStyle("-fx-text-fill: grey; -fx-font-size: 11px;");

            Label dirtyLabel = item.isDirty() ? new Label("⏳ Non synchronisé") : new Label("");
            dirtyLabel.setStyle("-fx-text-fill: orange; -fx-font-size: 10px;");

            HBox statusRow = new HBox(8, statusLabel, dirtyLabel);

            VBox cell = new VBox(2, titleLabel, statusRow);

            if (item.isConflict()) {
                Label conflictLabel = new Label("⚠ Conflit");
                conflictLabel.setStyle("-fx-text-fill: red; -fx-font-size: 10px; -fx-font-weight: bold;");

                Button resolveBtn = new Button("Résoudre");
                resolveBtn.setStyle("-fx-font-size: 10px;");
                resolveBtn.setOnAction(e -> view.openConflictDialog(item));

                HBox conflictRow = new HBox(8, conflictLabel, resolveBtn);
                conflictRow.setAlignment(Pos.CENTER_LEFT);
                cell.getChildren().add(conflictRow);
            }

            cell.setPadding(new Insets(4, 0, 4, 0));
            setGraphic(cell);
        }
    }
}
