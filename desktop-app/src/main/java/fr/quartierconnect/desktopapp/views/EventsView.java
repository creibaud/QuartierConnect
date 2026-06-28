package fr.quartierconnect.desktopapp.views;

import fr.quartierconnect.desktopapp.i18n.I18n;
import fr.quartierconnect.desktopapp.services.ApiService;
import fr.quartierconnect.desktopapp.services.AuthService;
import fr.quartierconnect.desktopapp.services.EventsService;
import fr.quartierconnect.desktopapp.ui.components.AppButton;
import fr.quartierconnect.desktopapp.ui.components.AppModal;
import fr.quartierconnect.desktopapp.ui.components.EmptyState;
import fr.quartierconnect.desktopapp.ui.components.SkeletonLoader;
import fr.quartierconnect.desktopapp.ui.components.ToastManager;
import javafx.application.Platform;
import javafx.beans.property.SimpleStringProperty;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.DatePicker;
import javafx.scene.control.Label;
import javafx.scene.control.TableCell;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.control.TextField;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;

import java.time.LocalDate;
import java.util.List;

public class EventsView {

    private final EventsService eventsService = new EventsService();
    private final AppModal appModal;
    private final ToastManager toast;
    private final VBox root;
    private final TableView<EventsService.EventSummary> table = new TableView<>();
    private final VBox skeletonHolder = new VBox();

    public EventsView(AppModal appModal, ToastManager toast) {
        this.appModal = appModal;
        this.toast = toast;
        this.root = buildLayout();
        loadAsync();
    }

    public VBox getRoot() {
        return root;
    }

    private VBox buildLayout() {
        Label pageTitle = new Label(I18n.get("events.title"));
        pageTitle.getStyleClass().add("content-title");

        Label pageSubtitle = new Label(I18n.get("events.subtitle"));
        pageSubtitle.getStyleClass().add("content-subtitle");

        AppButton createBtn = new AppButton(I18n.get("events.create"), AppButton.Variant.PRIMARY);
        createBtn.setOnAction(e -> openCreateForm());

        AppButton refreshBtn = new AppButton(I18n.get("events.refresh"), AppButton.Variant.SECONDARY);
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
        TableColumn<EventsService.EventSummary, String> titleCol = new TableColumn<>(I18n.get("events.col.title"));
        titleCol.setCellValueFactory(c -> new SimpleStringProperty(c.getValue().title()));
        titleCol.setCellFactory(col -> new TableCell<>() {
            @Override
            protected void updateItem(String val, boolean empty) {
                super.updateItem(val, empty);
                if (empty || val == null) { setText(null); setStyle(""); }
                else { setText(val); setStyle("-fx-font-weight: bold;"); }
            }
        });

        TableColumn<EventsService.EventSummary, String> dateCol = new TableColumn<>(I18n.get("events.col.date"));
        dateCol.setPrefWidth(140);
        dateCol.setResizable(false);
        dateCol.setCellValueFactory(c -> new SimpleStringProperty(
                c.getValue().date() != null ? c.getValue().date().substring(0, Math.min(10, c.getValue().date().length())) : "—"));

        TableColumn<EventsService.EventSummary, String> locationCol = new TableColumn<>(I18n.get("events.col.location"));
        locationCol.setPrefWidth(180);
        locationCol.setCellValueFactory(c -> new SimpleStringProperty(
                c.getValue().location() != null ? c.getValue().location() : "—"));

        TableColumn<EventsService.EventSummary, Void> actionsCol = new TableColumn<>(I18n.get("events.col.actions"));
        actionsCol.setPrefWidth(120);
        actionsCol.setResizable(false);
        actionsCol.setCellFactory(col -> new TableCell<>() {
            @Override
            protected void updateItem(Void item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || getIndex() >= getTableView().getItems().size()) {
                    setGraphic(null);
                } else {
                    EventsService.EventSummary event = getTableView().getItems().get(getIndex());
                    AppButton deleteBtn = new AppButton(I18n.get("events.delete"), AppButton.Variant.DESTRUCTIVE);
                    deleteBtn.setOnAction(e -> deleteEvent(event));
                    HBox box = new HBox(deleteBtn);
                    box.setAlignment(Pos.CENTER_LEFT);
                    box.setPadding(new Insets(0, 4, 0, 4));
                    setGraphic(box);
                }
            }
        });

        table.getColumns().addAll(titleCol, dateCol, locationCol, actionsCol);
        table.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY);
        table.getStyleClass().add("admin-table");
        table.setPlaceholder(new Label(I18n.get("events.empty")));
        table.setFixedCellSize(42);
    }

    private void loadAsync() {
        table.getItems().clear();
        SkeletonLoader skeleton = SkeletonLoader.forList(3);
        skeletonHolder.getChildren().setAll(skeleton);
        table.setVisible(false);

        new Thread(() -> {
            List<EventsService.EventSummary> events = eventsService.fetchEvents();
            Platform.runLater(() -> {
                skeleton.stop();
                skeletonHolder.getChildren().clear();
                table.setVisible(true);
                if (events.isEmpty()) {
                    table.setPlaceholder(new EmptyState(I18n.get("events.empty.title"), I18n.get("events.empty.subtitle")));
                } else {
                    table.getItems().setAll(events);
                }
            });
        }, "events-load").start();
    }

    private void deleteEvent(EventsService.EventSummary event) {
        new Thread(() -> {
            try {
                String token = AuthService.getInstance().getAccessToken();
                ApiService.delete("/events/" + event.id(), token);
                Platform.runLater(() -> {
                    loadAsync();
                    toast.showSuccess(I18n.get("events.deleted"));
                });
            } catch (Exception ex) {
                Platform.runLater(() -> toast.showError(I18n.get("common.error", ex.getMessage())));
            }
        }, "event-delete").start();
    }

    private void openCreateForm() {
        Label titleFormLabel = new Label(I18n.get("events.form.titleLabel"));
        titleFormLabel.getStyleClass().add("form-label");
        TextField titleField = new TextField();
        titleField.setPromptText(I18n.get("events.form.titlePrompt"));

        Label dateFormLabel = new Label(I18n.get("events.form.dateLabel"));
        dateFormLabel.getStyleClass().add("form-label");
        DatePicker datePicker = new DatePicker(LocalDate.now().plusDays(7));

        Label locationFormLabel = new Label(I18n.get("events.form.locationLabel"));
        locationFormLabel.getStyleClass().add("form-label");
        TextField locationField = new TextField();
        locationField.setPromptText(I18n.get("events.form.locationPrompt"));

        Label errorMsg = new Label("");
        errorMsg.getStyleClass().add("error-label");
        errorMsg.setVisible(false);
        errorMsg.setManaged(false);

        AppButton submitBtn = new AppButton(I18n.get("events.form.submit"), AppButton.Variant.PRIMARY);
        AppButton cancelBtn = new AppButton(I18n.get("events.form.cancel"), AppButton.Variant.SECONDARY);
        cancelBtn.setOnAction(e -> appModal.hide());

        submitBtn.setOnAction(e -> {
            String titleText = titleField.getText().trim();
            if (titleText.isEmpty()) {
                showError(errorMsg, I18n.get("events.form.titleRequired"));
                return;
            }
            if (datePicker.getValue() == null) {
                showError(errorMsg, I18n.get("events.form.dateRequired"));
                return;
            }

            submitBtn.setDisable(true);
            submitBtn.setText(I18n.get("events.form.creating"));
            String dateStr = datePicker.getValue().toString();
            String location = locationField.getText().trim();

            new Thread(() -> {
                try {
                    String token = AuthService.getInstance().getAccessToken();
                    String json = String.format(
                            "{\"title\": \"%s\", \"date\": \"%s\", \"location\": \"%s\"}",
                            titleText.replace("\"", "\\\""),
                            dateStr,
                            location.replace("\"", "\\\"")
                    );
                    ApiService.post("/events", json, token);
                    Platform.runLater(() -> {
                        appModal.hide();
                        loadAsync();
                        toast.showSuccess(I18n.get("events.created"));
                    });
                } catch (Exception ex) {
                    Platform.runLater(() -> {
                        submitBtn.setDisable(false);
                        submitBtn.setText(I18n.get("events.form.submit"));
                        showError(errorMsg, I18n.get("events.form.networkError"));
                    });
                }
            }, "event-create").start();
        });

        HBox buttons = new HBox(8, submitBtn, cancelBtn);
        buttons.setAlignment(Pos.CENTER_RIGHT);

        VBox content = new VBox(10,
                titleFormLabel, titleField,
                dateFormLabel, datePicker,
                locationFormLabel, locationField,
                errorMsg, buttons);
        content.setPadding(new Insets(20));
        appModal.show(I18n.get("events.form.modalTitle"), content);
    }

    private void showError(Label errorMsg, String message) {
        errorMsg.setText(message);
        errorMsg.setVisible(true);
        errorMsg.setManaged(true);
    }
}
