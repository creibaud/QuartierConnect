package fr.quartierconnect.desktopapp.views;

import fr.quartierconnect.desktopapp.i18n.I18n;
import fr.quartierconnect.desktopapp.services.ApiService;
import fr.quartierconnect.desktopapp.services.AuthService;
import fr.quartierconnect.desktopapp.services.NeighborhoodsService;
import fr.quartierconnect.desktopapp.services.ServicesService;
import fr.quartierconnect.desktopapp.ui.components.AppButton;
import fr.quartierconnect.desktopapp.ui.components.AppModal;
import fr.quartierconnect.desktopapp.ui.components.EmptyState;
import fr.quartierconnect.desktopapp.ui.components.SkeletonLoader;
import fr.quartierconnect.desktopapp.ui.components.ToastManager;
import javafx.application.Platform;
import javafx.beans.property.SimpleStringProperty;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.TableCell;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;

import java.util.List;

public class ServicesView {

    private final ServicesService servicesService = new ServicesService();
    private final NeighborhoodsService neighborhoodsService = new NeighborhoodsService();
    private final AppModal appModal;
    private final ToastManager toast;
    private final VBox root;
    private final TableView<ServicesService.ServiceSummary> table = new TableView<>();
    private final VBox skeletonHolder = new VBox();

    public ServicesView(AppModal appModal, ToastManager toast) {
        this.appModal = appModal;
        this.toast = toast;
        this.root = buildLayout();
        loadAsync();
    }

    public VBox getRoot() {
        return root;
    }

    private VBox buildLayout() {
        Label pageTitle = new Label(I18n.get("services.title"));
        pageTitle.getStyleClass().add("content-title");

        Label pageSubtitle = new Label(I18n.get("services.subtitle"));
        pageSubtitle.getStyleClass().add("content-subtitle");

        AppButton createBtn = new AppButton(I18n.get("services.create"), AppButton.Variant.PRIMARY);
        createBtn.setOnAction(e -> openCreateForm());

        AppButton refreshBtn = new AppButton(I18n.get("services.refresh"), AppButton.Variant.SECONDARY);
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
        TableColumn<ServicesService.ServiceSummary, String> titleCol = new TableColumn<>(I18n.get("services.col.title"));
        titleCol.setCellValueFactory(c -> new SimpleStringProperty(c.getValue().title()));
        titleCol.setCellFactory(col -> new TableCell<>() {
            @Override
            protected void updateItem(String val, boolean empty) {
                super.updateItem(val, empty);
                if (empty || val == null) { setText(null); setStyle(""); }
                else { setText(val); setStyle("-fx-font-weight: bold;"); }
            }
        });

        TableColumn<ServicesService.ServiceSummary, String> neighborhoodCol = new TableColumn<>(I18n.get("services.col.neighborhood"));
        neighborhoodCol.setPrefWidth(160);
        neighborhoodCol.setCellValueFactory(c -> new SimpleStringProperty(
                c.getValue().neighborhoodName() != null ? c.getValue().neighborhoodName() : "—"));

        TableColumn<ServicesService.ServiceSummary, String> votesCol = new TableColumn<>(I18n.get("services.col.votes"));
        votesCol.setPrefWidth(100);
        votesCol.setResizable(false);
        votesCol.setCellValueFactory(c -> new SimpleStringProperty(
                "▲ " + c.getValue().upvotes() + "  ▼ " + c.getValue().downvotes()));

        TableColumn<ServicesService.ServiceSummary, Void> actionsCol = new TableColumn<>(I18n.get("services.col.actions"));
        actionsCol.setPrefWidth(120);
        actionsCol.setResizable(false);
        actionsCol.setCellFactory(col -> new TableCell<>() {
            @Override
            protected void updateItem(Void item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || getIndex() >= getTableView().getItems().size()) {
                    setGraphic(null);
                } else {
                    ServicesService.ServiceSummary service = getTableView().getItems().get(getIndex());
                    AppButton deleteBtn = new AppButton(I18n.get("services.delete"), AppButton.Variant.DESTRUCTIVE);
                    deleteBtn.setOnAction(e -> deleteService(service));
                    HBox box = new HBox(deleteBtn);
                    box.setAlignment(Pos.CENTER_LEFT);
                    box.setPadding(new Insets(0, 4, 0, 4));
                    setGraphic(box);
                }
            }
        });

        table.getColumns().addAll(titleCol, neighborhoodCol, votesCol, actionsCol);
        table.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY);
        table.getStyleClass().add("admin-table");
        table.setPlaceholder(new Label(I18n.get("services.empty")));
        table.setFixedCellSize(42);
    }

    private void loadAsync() {
        table.getItems().clear();
        SkeletonLoader skeleton = SkeletonLoader.forList(3);
        skeletonHolder.getChildren().setAll(skeleton);
        table.setVisible(false);

        new Thread(() -> {
            List<ServicesService.ServiceSummary> services = servicesService.fetchServices();
            Platform.runLater(() -> {
                skeleton.stop();
                skeletonHolder.getChildren().clear();
                table.setVisible(true);
                if (services.isEmpty()) {
                    table.setPlaceholder(new EmptyState(I18n.get("services.empty.title"), I18n.get("services.empty.subtitle")));
                } else {
                    table.getItems().setAll(services);
                }
            });
        }, "services-load").start();
    }

    private void deleteService(ServicesService.ServiceSummary service) {
        new Thread(() -> {
            try {
                String token = AuthService.getInstance().getAccessToken();
                ApiService.delete("/services/" + service.id(), token);
                Platform.runLater(() -> {
                    loadAsync();
                    toast.showSuccess(I18n.get("services.deleted"));
                });
            } catch (Exception ex) {
                Platform.runLater(() -> toast.showError(I18n.get("common.error", ex.getMessage())));
            }
        }, "service-delete").start();
    }

    private void openCreateForm() {
        Label titleFormLabel = new Label(I18n.get("services.form.titleLabel"));
        titleFormLabel.getStyleClass().add("form-label");
        TextField titleField = new TextField();
        titleField.setPromptText(I18n.get("services.form.titlePrompt"));

        Label descFormLabel = new Label(I18n.get("services.form.descLabel"));
        descFormLabel.getStyleClass().add("form-label");
        TextArea descField = new TextArea();
        descField.setPromptText(I18n.get("services.form.descPrompt"));
        descField.setPrefRowCount(2);
        descField.setWrapText(true);

        Label neighborhoodFormLabel = new Label(I18n.get("services.form.neighborhoodLabel"));
        neighborhoodFormLabel.getStyleClass().add("form-label");
        ComboBox<NeighborhoodsService.NeighborhoodSummary> neighborhoodCombo = new ComboBox<>();
        neighborhoodCombo.setPromptText(I18n.get("services.form.neighborhoodPrompt"));
        neighborhoodCombo.setMaxWidth(Double.MAX_VALUE);

        new Thread(() -> {
            List<NeighborhoodsService.NeighborhoodSummary> neighborhoods = neighborhoodsService.fetchNeighborhoods();
            Platform.runLater(() -> {
                neighborhoodCombo.getItems().addAll(neighborhoods);
                neighborhoodCombo.setConverter(new javafx.util.StringConverter<>() {
                    @Override
                    public String toString(NeighborhoodsService.NeighborhoodSummary n) {
                        return n != null ? n.name() : "";
                    }
                    @Override
                    public NeighborhoodsService.NeighborhoodSummary fromString(String s) { return null; }
                });
            });
        }, "neighborhoods-fetch").start();

        Label errorMsg = new Label("");
        errorMsg.getStyleClass().add("error-label");
        errorMsg.setVisible(false);
        errorMsg.setManaged(false);

        AppButton submitBtn = new AppButton(I18n.get("services.form.submit"), AppButton.Variant.PRIMARY);
        AppButton cancelBtn = new AppButton(I18n.get("services.form.cancel"), AppButton.Variant.SECONDARY);
        cancelBtn.setOnAction(e -> appModal.hide());

        submitBtn.setOnAction(e -> {
            String titleText = titleField.getText().trim();
            if (titleText.isEmpty()) {
                showError(errorMsg, I18n.get("services.form.titleRequired"));
                return;
            }
            submitBtn.setDisable(true);
            submitBtn.setText(I18n.get("services.form.creating"));

            String description = descField.getText().trim();
            NeighborhoodsService.NeighborhoodSummary selectedNeighborhood = neighborhoodCombo.getValue();

            new Thread(() -> {
                try {
                    String token = AuthService.getInstance().getAccessToken();
                    StringBuilder json = new StringBuilder("{\"title\": \"")
                            .append(titleText.replace("\"", "\\\"")).append("\"");
                    if (!description.isEmpty()) {
                        json.append(", \"description\": \"").append(description.replace("\"", "\\\"")).append("\"");
                    }
                    if (selectedNeighborhood != null) {
                        json.append(", \"neighborhood\": \"").append(selectedNeighborhood.id()).append("\"");
                    }
                    json.append("}");
                    ApiService.post("/services", json.toString(), token);
                    Platform.runLater(() -> {
                        appModal.hide();
                        loadAsync();
                        toast.showSuccess(I18n.get("services.created"));
                    });
                } catch (Exception ex) {
                    Platform.runLater(() -> {
                        submitBtn.setDisable(false);
                        submitBtn.setText(I18n.get("services.form.submit"));
                        showError(errorMsg, I18n.get("services.form.networkError"));
                    });
                }
            }, "service-create").start();
        });

        HBox buttons = new HBox(8, submitBtn, cancelBtn);
        buttons.setAlignment(Pos.CENTER_RIGHT);

        VBox content = new VBox(10,
                titleFormLabel, titleField,
                descFormLabel, descField,
                neighborhoodFormLabel, neighborhoodCombo,
                errorMsg, buttons);
        content.setPadding(new Insets(20));
        appModal.show(I18n.get("services.form.modalTitle"), content);
    }

    private void showError(Label errorMsg, String message) {
        errorMsg.setText(message);
        errorMsg.setVisible(true);
        errorMsg.setManaged(true);
    }
}
