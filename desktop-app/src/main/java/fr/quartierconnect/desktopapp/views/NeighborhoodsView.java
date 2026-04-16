package fr.quartierconnect.desktopapp.views;

import fr.quartierconnect.desktopapp.services.ApiService;
import fr.quartierconnect.desktopapp.services.AuthService;
import fr.quartierconnect.desktopapp.services.NeighborhoodsService;
import fr.quartierconnect.desktopapp.ui.components.AppButton;
import fr.quartierconnect.desktopapp.ui.components.AppModal;
import fr.quartierconnect.desktopapp.ui.components.EmptyState;
import fr.quartierconnect.desktopapp.ui.components.SkeletonLoader;
import fr.quartierconnect.desktopapp.ui.components.ToastManager;
import javafx.application.Platform;
import javafx.beans.property.SimpleStringProperty;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Label;
import javafx.scene.control.TableCell;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.control.TextField;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;

import java.util.List;

public class NeighborhoodsView {

    private final NeighborhoodsService neighborhoodsService = new NeighborhoodsService();
    private final AppModal appModal;
    private final ToastManager toast;
    private final VBox root;
    private final TableView<NeighborhoodsService.NeighborhoodSummary> table = new TableView<>();
    private final VBox skeletonHolder = new VBox();

    public NeighborhoodsView(AppModal appModal, ToastManager toast) {
        this.appModal = appModal;
        this.toast = toast;
        this.root = buildLayout();
        loadAsync();
    }

    public VBox getRoot() {
        return root;
    }

    private VBox buildLayout() {
        Label pageTitle = new Label("Gestion des quartiers");
        pageTitle.getStyleClass().add("content-title");

        Label pageSubtitle = new Label("Administration des zones géographiques");
        pageSubtitle.getStyleClass().add("content-subtitle");

        AppButton createBtn = new AppButton("+ Créer un quartier", AppButton.Variant.PRIMARY);
        createBtn.setOnAction(e -> openCreateForm());

        AppButton refreshBtn = new AppButton("↺ Actualiser", AppButton.Variant.SECONDARY);
        refreshBtn.setOnAction(e -> loadAsync());

        HBox header = new HBox(8, new VBox(4, pageTitle, pageSubtitle), refreshBtn, createBtn);
        header.setAlignment(Pos.CENTER_LEFT);
        HBox.setHgrow(header.getChildren().get(0), Priority.ALWAYS);
        header.setPadding(new Insets(0, 0, 14, 0));

        buildTable();
        VBox.setVgrow(table, Priority.ALWAYS);

        VBox layout = new VBox(0, header, skeletonHolder, table);
        layout.setPadding(new Insets(30));
        layout.getStyleClass().add("content-area");
        return layout;
    }

    private void buildTable() {
        TableColumn<NeighborhoodsService.NeighborhoodSummary, String> nameCol = new TableColumn<>("Nom du quartier");
        nameCol.setCellValueFactory(c -> new SimpleStringProperty(c.getValue().name()));
        nameCol.setCellFactory(col -> new TableCell<>() {
            @Override
            protected void updateItem(String val, boolean empty) {
                super.updateItem(val, empty);
                if (empty || val == null) { setText(null); setStyle(""); }
                else { setText(val); setStyle("-fx-font-weight: bold; -fx-font-size: 13px;"); }
            }
        });

        TableColumn<NeighborhoodsService.NeighborhoodSummary, String> idCol = new TableColumn<>("Identifiant");
        idCol.setPrefWidth(240);
        idCol.setResizable(false);
        idCol.setCellValueFactory(c -> new SimpleStringProperty(c.getValue().id()));
        idCol.setCellFactory(col -> new TableCell<>() {
            @Override
            protected void updateItem(String val, boolean empty) {
                super.updateItem(val, empty);
                if (empty || val == null) { setText(null); setStyle(""); }
                else { setText(val); setStyle("-fx-text-fill: -color-fg-subtle; -fx-font-size: 11px;"); }
            }
        });

        TableColumn<NeighborhoodsService.NeighborhoodSummary, Void> actionsCol = new TableColumn<>("Actions");
        actionsCol.setPrefWidth(130);
        actionsCol.setResizable(false);
        actionsCol.setCellFactory(col -> new TableCell<>() {
            @Override
            protected void updateItem(Void item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || getIndex() >= getTableView().getItems().size()) {
                    setGraphic(null);
                } else {
                    NeighborhoodsService.NeighborhoodSummary n = getTableView().getItems().get(getIndex());
                    AppButton deleteBtn = new AppButton("Supprimer", AppButton.Variant.DESTRUCTIVE);
                    deleteBtn.setOnAction(e -> deleteNeighborhood(n));
                    HBox box = new HBox(deleteBtn);
                    box.setAlignment(Pos.CENTER_LEFT);
                    box.setPadding(new Insets(0, 4, 0, 4));
                    setGraphic(box);
                }
            }
        });

        table.getColumns().addAll(nameCol, idCol, actionsCol);
        table.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY);
        table.getStyleClass().add("admin-table");
        table.setPlaceholder(new Label("Aucun quartier"));
        table.setFixedCellSize(42);
    }

    private void loadAsync() {
        table.getItems().clear();
        SkeletonLoader skeleton = SkeletonLoader.forList(3);
        skeletonHolder.getChildren().setAll(skeleton);
        table.setVisible(false);

        new Thread(() -> {
            List<NeighborhoodsService.NeighborhoodSummary> neighborhoods = neighborhoodsService.fetchNeighborhoods();
            Platform.runLater(() -> {
                skeleton.stop();
                skeletonHolder.getChildren().clear();
                table.setVisible(true);
                if (neighborhoods.isEmpty()) {
                    table.setPlaceholder(new EmptyState("Aucun quartier.", "Créez le premier quartier avec le bouton ci-dessus."));
                } else {
                    table.getItems().setAll(neighborhoods);
                }
            });
        }, "neighborhoods-load").start();
    }

    private void deleteNeighborhood(NeighborhoodsService.NeighborhoodSummary neighborhood) {
        new Thread(() -> {
            try {
                String token = AuthService.getInstance().getAccessToken();
                ApiService.delete("/neighborhoods/" + neighborhood.id(), token);
                Platform.runLater(() -> {
                    loadAsync();
                    toast.showSuccess("Quartier supprimé ✓");
                });
            } catch (Exception ex) {
                Platform.runLater(() -> toast.showError("Erreur — " + ex.getMessage()));
            }
        }, "neighborhood-delete").start();
    }

    private void openCreateForm() {
        Label nameFormLabel = new Label("Nom *");
        nameFormLabel.getStyleClass().add("form-label");
        TextField nameField = new TextField();
        nameField.setPromptText("Ex : Quartier des Arts");

        Label errorMsg = new Label("");
        errorMsg.getStyleClass().add("error-label");
        errorMsg.setVisible(false);
        errorMsg.setManaged(false);

        AppButton submitBtn = new AppButton("Créer", AppButton.Variant.PRIMARY);
        AppButton cancelBtn = new AppButton("Annuler", AppButton.Variant.SECONDARY);
        cancelBtn.setOnAction(e -> appModal.hide());

        submitBtn.setOnAction(e -> {
            String nameText = nameField.getText().trim();
            if (nameText.isEmpty()) {
                showError(errorMsg, "Le nom est obligatoire.");
                return;
            }

            submitBtn.setDisable(true);
            submitBtn.setText("Création…");

            new Thread(() -> {
                try {
                    String token = AuthService.getInstance().getAccessToken();
                    String json = "{\"name\": \"" + nameText.replace("\"", "\\\"") + "\"}";
                    ApiService.post("/neighborhoods", json, token);
                    Platform.runLater(() -> {
                        appModal.hide();
                        loadAsync();
                        toast.showSuccess("Quartier créé ✓");
                    });
                } catch (Exception ex) {
                    Platform.runLater(() -> {
                        submitBtn.setDisable(false);
                        submitBtn.setText("Créer");
                        showError(errorMsg, "Erreur réseau — réessayez.");
                    });
                }
            }, "neighborhood-create").start();
        });

        HBox buttons = new HBox(8, submitBtn, cancelBtn);
        buttons.setAlignment(Pos.CENTER_RIGHT);

        VBox content = new VBox(10, nameFormLabel, nameField, errorMsg, buttons);
        content.setPadding(new Insets(20));
        appModal.show("Créer un quartier", content);
    }

    private void showError(Label errorMsg, String message) {
        errorMsg.setText(message);
        errorMsg.setVisible(true);
        errorMsg.setManaged(true);
    }
}
