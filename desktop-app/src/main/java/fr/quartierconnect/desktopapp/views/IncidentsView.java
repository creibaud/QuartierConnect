package fr.quartierconnect.desktopapp.views;

import fr.quartierconnect.desktopapp.database.IncidentRepository;
import fr.quartierconnect.desktopapp.database.SQLiteDatabase;
import fr.quartierconnect.desktopapp.i18n.I18n;
import fr.quartierconnect.desktopapp.plugin.PluginRegistry;
import fr.quartierconnect.desktopapp.services.ApiService;
import fr.quartierconnect.desktopapp.services.AuthService;
import fr.quartierconnect.desktopapp.services.SyncService;
import fr.quartierconnect.desktopapp.ui.components.AppBadge;
import fr.quartierconnect.desktopapp.ui.components.AppButton;
import fr.quartierconnect.desktopapp.ui.components.AppModal;
import fr.quartierconnect.desktopapp.ui.components.ToastManager;
import fr.quartierconnect.desktopapp.util.UiHelper;
import javafx.application.Platform;
import javafx.beans.property.SimpleStringProperty;
import javafx.collections.ListChangeListener;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.ContextMenu;
import javafx.scene.control.Label;
import javafx.scene.control.MenuItem;
import javafx.scene.control.ScrollPane;
import javafx.scene.control.SeparatorMenuItem;
import javafx.scene.control.TableCell;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableRow;
import javafx.scene.control.TableView;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.ColumnConstraints;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.layout.VBox;
import org.kordamp.ikonli.fontawesome5.FontAwesomeSolid;
import org.kordamp.ikonli.javafx.FontIcon;

import java.sql.SQLException;
import java.util.List;
import java.util.Locale;

public class IncidentsView {

    private final IncidentRepository repo = new IncidentRepository();
    private final AppModal            appModal;
    private final ToastManager        toast;
    private final SyncService         syncService;
    private final VBox                root;

    private final TextField searchField  = new TextField();
    private final AppButton[] filterButtons = new AppButton[5];
    private String activeFilter = "all";
    private final HBox conflictBanner = new HBox(10);
    private List<IncidentRepository.Incident> allIncidents = List.of();
    private final TableView<IncidentRepository.Incident> table = new TableView<>();
    private final Label footerInfo = new Label("—");
    private Runnable onLocalChange;

    public IncidentsView(AppModal appModal, ToastManager toast, SyncService syncService) {
        this.appModal    = appModal;
        this.toast       = toast;
        this.syncService = syncService;
        this.root        = buildLayout();
        refresh();
    }

    public void setOnLocalChange(Runnable callback) { this.onLocalChange = callback; }
    public VBox getRoot() { return root; }

    private void notifyLocalChange() {
        if (onLocalChange != null) onLocalChange.run();
    }

    // ── Refresh ──────────────────────────────────────────────────────────────

    public void refresh() {
        new Thread(() -> {
            try {
                List<IncidentRepository.Incident> loaded = repo.listAll();
                allIncidents = loaded;
                Platform.runLater(() -> {
                    IncidentRepository.Incident selected = table.getSelectionModel().getSelectedItem();
                    int selectedId = selected != null ? selected.localId() : -1;
                    applyFilter();
                    updateFilterCounts();
                    if (selectedId >= 0) {
                        table.getItems().stream()
                            .filter(i -> i.localId() == selectedId)
                            .findFirst()
                            .ifPresent(i -> table.getSelectionModel().select(i));
                    }
                });
            } catch (SQLException e) {
                Platform.runLater(() ->
                    table.setPlaceholder(new Label(I18n.get("incidents.loadError")))
                );
            }
        }, "incidents-refresh").start();
    }

    // ── Layout ───────────────────────────────────────────────────────────────

    private VBox buildLayout() {
        Label pageTitle = new Label(I18n.get("incidents.title"));
        pageTitle.getStyleClass().add("content-title");

        Label pageSubtitle = new Label(I18n.get("incidents.subtitle"));
        pageSubtitle.getStyleClass().add("content-subtitle");

        VBox titleBlock = new VBox(3, pageTitle, pageSubtitle);
        HBox.setHgrow(titleBlock, Priority.ALWAYS);

        HBox headerActions = buildHeaderActions();

        HBox pageHeader = new HBox(titleBlock, headerActions);
        pageHeader.setAlignment(Pos.CENTER_LEFT);
        VBox.setMargin(pageHeader, new Insets(0, 0, 16, 0));

        HBox filterRow = buildFilterRow();
        VBox.setMargin(filterRow, new Insets(0, 0, 10, 0));

        buildTable();
        VBox.setVgrow(table, Priority.ALWAYS);

        footerInfo.getStyleClass().add("tbl-info");
        Label footerDb = new Label("quartierconnect.db");
        footerDb.getStyleClass().add("tbl-db-label");
        Region footerSpacer = new Region();
        HBox.setHgrow(footerSpacer, Priority.ALWAYS);
        HBox tableFooter = new HBox(footerInfo, footerSpacer, footerDb);
        tableFooter.getStyleClass().add("tbl-footer");
        tableFooter.setAlignment(Pos.CENTER_LEFT);

        VBox tblWrap = new VBox(0, table, tableFooter);
        tblWrap.getStyleClass().add("tbl-wrap");
        VBox.setVgrow(tblWrap, Priority.ALWAYS);

        buildConflictBanner();
        VBox.setMargin(conflictBanner, new Insets(0, 0, 10, 0));

        VBox innerContent = new VBox(0, pageHeader, filterRow, conflictBanner, tblWrap);
        innerContent.setPadding(new Insets(22, 22, 14, 22));
        VBox.setVgrow(tblWrap, Priority.ALWAYS);

        ScrollPane scroll = new ScrollPane(innerContent);
        scroll.setFitToWidth(true);
        scroll.setFitToHeight(true);
        scroll.getStyleClass().add("content-scroll");
        VBox.setVgrow(scroll, Priority.ALWAYS);

        VBox layout = new VBox(0, scroll);
        layout.getStyleClass().add("content-area");
        VBox.setVgrow(scroll, Priority.ALWAYS);
        return layout;
    }

    private HBox buildHeaderActions() {
        AppButton syncBtn = new AppButton(I18n.get("incidents.sync"), AppButton.Variant.SECONDARY);
        syncBtn.setGraphic(UiHelper.icon(FontAwesomeSolid.CLOUD_UPLOAD_ALT, 11));
        syncBtn.setGraphicTextGap(6);
        syncBtn.setOnAction(e -> triggerSync(syncBtn));

        AppButton createBtn = new AppButton(I18n.get("incidents.new"), AppButton.Variant.PRIMARY);
        createBtn.setGraphic(UiHelper.icon(FontAwesomeSolid.PLUS, 11));
        createBtn.setGraphicTextGap(6);
        createBtn.setOnAction(e -> openCreateForm());

        HBox pluginActions = new HBox(6);
        pluginActions.setAlignment(Pos.CENTER_RIGHT);
        pluginActions.getChildren().addAll(PluginRegistry.getInstance().getIncidentSlot());
        PluginRegistry.getInstance().getIncidentSlot().addListener(
            (ListChangeListener<javafx.scene.Node>) change ->
                Platform.runLater(() -> {
                    pluginActions.getChildren().clear();
                    pluginActions.getChildren().addAll(PluginRegistry.getInstance().getIncidentSlot());
                })
        );

        AppButton demoBtn = new AppButton(I18n.get("incidents.demoConflicts"), AppButton.Variant.SECONDARY);
        demoBtn.setGraphic(UiHelper.icon(FontAwesomeSolid.EXCLAMATION_TRIANGLE, 11));
        demoBtn.setGraphicTextGap(6);
        demoBtn.setOnAction(e -> {
            try {
                SQLiteDatabase.insertDemoConflicts();
                refresh();
                notifyLocalChange();
                toast.showSuccess(I18n.get("incidents.demoConflictsInserted"));
            } catch (Exception ex) {
                toast.showError(I18n.get("incidents.error", ex.getMessage()));
            }
        });

        HBox box = new HBox(6, syncBtn, demoBtn, pluginActions, createBtn);
        box.setAlignment(Pos.CENTER_RIGHT);
        return box;
    }

    private void triggerSync(AppButton syncBtn) {
        syncBtn.setDisable(true);
        syncBtn.setText(I18n.get("incidents.syncing"));
        new Thread(() -> {
            boolean ok = false;
            try { syncService.syncNowAndWait(); ok = true; } catch (Exception ignored) {}
            final boolean success = ok;
            Platform.runLater(() -> {
                syncBtn.setDisable(false);
                syncBtn.setText(I18n.get("incidents.sync"));
                if (success) { toast.showSuccess(I18n.get("incidents.syncSuccess")); refresh(); }
                else           toast.showError(I18n.get("incidents.syncFailed"));
            });
        }, "incidents-sync").start();
    }

    private HBox buildFilterRow() {
        searchField.setPromptText(I18n.get("incidents.search"));
        searchField.textProperty().addListener((obs, o, n) -> applyFilter());
        searchField.getStyleClass().add("filter-search");
        HBox.setHgrow(searchField, Priority.ALWAYS);

        filterButtons[0] = filterBtn(I18n.get("incidents.filter.all"),        "all");
        filterButtons[1] = filterBtn(I18n.get("incidents.filter.open"),       "open");
        filterButtons[2] = filterBtn(I18n.get("incidents.filter.inProgress"), "in_progress");
        filterButtons[3] = filterBtn(I18n.get("incidents.filter.resolved"),   "resolved");
        filterButtons[4] = filterBtn(I18n.get("incidents.filter.conflicts"),  "conflict");
        filterButtons[4].getStyleClass().add("filter-btn-conflict");
        filterButtons[0].getStyleClass().add("filter-btn-active");

        HBox row = new HBox(7, searchField,
            filterButtons[0], filterButtons[1], filterButtons[2], filterButtons[3], filterButtons[4]);
        row.setAlignment(Pos.CENTER_LEFT);
        return row;
    }

    private void buildConflictBanner() {
        conflictBanner.getStyleClass().add("conflict-banner");
        conflictBanner.setAlignment(Pos.CENTER_LEFT);
        conflictBanner.setVisible(false);
        conflictBanner.setManaged(false);
    }

    private void refreshConflictBanner() {
        long conflicts = allIncidents.stream().filter(IncidentRepository.Incident::isConflict).count();
        conflictBanner.getChildren().clear();
        if (conflicts == 0) {
            conflictBanner.setVisible(false);
            conflictBanner.setManaged(false);
            return;
        }

        FontIcon warnIcon = new FontIcon(FontAwesomeSolid.EXCLAMATION_TRIANGLE);
        warnIcon.setIconSize(13);
        warnIcon.getStyleClass().add("conflict-banner-icon");

        Label msg = new Label(conflicts > 1
                ? I18n.get("incidents.conflict.needAttentionMany", conflicts)
                : I18n.get("incidents.conflict.needAttentionOne", conflicts));
        msg.getStyleClass().add("conflict-banner-text");
        HBox.setHgrow(msg, Priority.ALWAYS);

        AppButton resolveBtn = new AppButton(I18n.get("incidents.conflict.resolveNow"), AppButton.Variant.SECONDARY);
        resolveBtn.getStyleClass().add("conflict-banner-btn");
        resolveBtn.setOnAction(e -> {
            activeFilter = "conflict";
            for (AppButton fb : filterButtons) fb.getStyleClass().remove("filter-btn-active");
            filterButtons[4].getStyleClass().add("filter-btn-active");
            applyFilter();
            allIncidents.stream().filter(IncidentRepository.Incident::isConflict)
                .findFirst().ifPresent(this::openConflictForm);
        });

        conflictBanner.getChildren().addAll(warnIcon, msg, resolveBtn);
        conflictBanner.setVisible(true);
        conflictBanner.setManaged(true);
    }

    // ── Table ────────────────────────────────────────────────────────────────

    private void buildTable() {
        // #
        TableColumn<IncidentRepository.Incident, String> idxCol = new TableColumn<>("#");
        idxCol.setPrefWidth(34);
        idxCol.setMinWidth(34);
        idxCol.setMaxWidth(34);
        idxCol.setResizable(false);
        idxCol.setCellValueFactory(c -> new SimpleStringProperty(""));
        idxCol.setCellFactory(col -> new TableCell<>() {
            @Override protected void updateItem(String v, boolean empty) {
                super.updateItem(v, empty);
                setText(empty ? null : String.valueOf(getIndex() + 1));
                setStyle("-fx-font-family: monospace; -fx-font-size: 10px; -fx-text-fill: -color-fg-subtle; -fx-alignment: center;");
            }
        });

        // Statut
        TableColumn<IncidentRepository.Incident, String> statusCol = new TableColumn<>(I18n.get("incidents.col.status"));
        statusCol.setPrefWidth(95);
        statusCol.setMinWidth(95);
        statusCol.setMaxWidth(95);
        statusCol.setResizable(false);
        statusCol.setCellValueFactory(c -> new SimpleStringProperty(c.getValue().status()));
        statusCol.setCellFactory(col -> new TableCell<>() {
            @Override protected void updateItem(String s, boolean empty) {
                super.updateItem(s, empty);
                setGraphic(empty || s == null ? null : AppBadge.fromStatus(s));
            }
        });

        // Titre + description
        TableColumn<IncidentRepository.Incident, IncidentRepository.Incident> titleCol = new TableColumn<>(I18n.get("incidents.col.title"));
        titleCol.setCellValueFactory(c -> new javafx.beans.property.SimpleObjectProperty<>(c.getValue()));
        titleCol.setCellFactory(col -> new TableCell<>() {
            private final Label titleLbl = new Label();
            private final Label descLbl  = new Label();
            {
                titleLbl.getStyleClass().add("tbl-title");
                descLbl.getStyleClass().add("tbl-desc");
                descLbl.setMaxWidth(Double.MAX_VALUE);
                titleLbl.setMaxWidth(Double.MAX_VALUE);
                VBox cell = new VBox(1, titleLbl, descLbl);
                cell.setAlignment(Pos.CENTER_LEFT);
                cell.setPadding(new Insets(4, 0, 4, 0));
                setGraphic(cell);
            }
            @Override protected void updateItem(IncidentRepository.Incident item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    titleLbl.setText(null); descLbl.setText(null);
                } else {
                    titleLbl.setText(item.title() != null ? item.title() : I18n.get("incidents.untitled"));
                    String desc = item.description();
                    if (desc != null && !desc.isBlank()) {
                        descLbl.setText(desc.length() > 80 ? desc.substring(0, 80) + "…" : desc);
                    } else {
                        descLbl.setText(I18n.get("incidents.noDescription"));
                    }
                }
            }
        });

        // Sync state
        TableColumn<IncidentRepository.Incident, IncidentRepository.Incident> syncCol = new TableColumn<>(I18n.get("incidents.col.syncState"));
        syncCol.setPrefWidth(90);
        syncCol.setMinWidth(90);
        syncCol.setMaxWidth(90);
        syncCol.setResizable(false);
        syncCol.setCellValueFactory(c -> new javafx.beans.property.SimpleObjectProperty<>(c.getValue()));
        syncCol.setCellFactory(col -> new TableCell<>() {
            @Override protected void updateItem(IncidentRepository.Incident item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) { setGraphic(null); return; }
                if (item.isConflict())     setGraphic(new AppBadge(I18n.get("incidents.state.conflict"),  AppBadge.Variant.CONFLICT));
                else if (item.isDirty())   setGraphic(new AppBadge(I18n.get("incidents.state.pending"), AppBadge.Variant.DIRTY));
                else                       setGraphic(null);
            }
        });

        // Date
        TableColumn<IncidentRepository.Incident, String> dateCol = new TableColumn<>(I18n.get("incidents.col.modified"));
        dateCol.setPrefWidth(82);
        dateCol.setMinWidth(82);
        dateCol.setMaxWidth(82);
        dateCol.setResizable(false);
        dateCol.setCellValueFactory(c -> new SimpleStringProperty(UiHelper.formatIsoDate(c.getValue().updatedAt())));
        dateCol.setCellFactory(col -> new TableCell<>() {
            @Override protected void updateItem(String v, boolean empty) {
                super.updateItem(v, empty);
                setText(empty ? null : v);
                setStyle("-fx-font-family: monospace; -fx-font-size: 10px; -fx-text-fill: -color-fg-muted;");
            }
        });

        table.getColumns().addAll(idxCol, statusCol, titleCol, syncCol, dateCol);
        table.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY);
        table.getStyleClass().add("incidents-table");
        table.setFixedCellSize(48);
        table.setPlaceholder(buildEmptyPlaceholder());

        table.setRowFactory(tv -> {
            TableRow<IncidentRepository.Incident> row = new TableRow<>() {
                @Override protected void updateItem(IncidentRepository.Incident item, boolean empty) {
                    super.updateItem(item, empty);
                    getStyleClass().removeAll("row-conflict", "row-dirty");
                    if (item != null && !empty) {
                        if (item.isConflict())    getStyleClass().add("row-conflict");
                        else if (item.isDirty())  getStyleClass().add("row-dirty");
                    }
                }
            };

            row.setOnMouseClicked(e -> {
                if (e.getClickCount() == 2 && row.getItem() != null) {
                    if (row.getItem().isConflict()) openConflictForm(row.getItem());
                    else                            openDetailForm(row.getItem());
                }
            });

            row.setOnContextMenuRequested(e -> {
                if (row.getItem() == null) return;
                buildContextMenu(row.getItem()).show(row, e.getScreenX(), e.getScreenY());
                e.consume();
            });

            return row;
        });
    }

    private ContextMenu buildContextMenu(IncidentRepository.Incident item) {
        ContextMenu menu = new ContextMenu();
        menu.getStyleClass().add("incidents-context-menu");

        // Conflict resolution — top priority
        if (item.isConflict()) {
            menu.getItems().add(menuItem(I18n.get("incidents.menu.resolveConflict"), FontAwesomeSolid.CODE_BRANCH, false,
                () -> openConflictForm(item)));
            menu.getItems().add(new SeparatorMenuItem());
        }

        // Edit
        menu.getItems().add(menuItem(I18n.get("incidents.menu.edit"), FontAwesomeSolid.EDIT, false,
            () -> openDetailForm(item)));

        // Status transitions
        if (!item.isConflict()) {
            menu.getItems().add(new SeparatorMenuItem());

            switch (item.status()) {
                case "open" -> {
                    menu.getItems().add(menuItem(I18n.get("incidents.menu.setInProgress"), FontAwesomeSolid.ARROW_RIGHT, false,
                        () -> changeStatus(item, "in_progress")));
                    menu.getItems().add(menuItem(I18n.get("incidents.menu.markResolved"), FontAwesomeSolid.CHECK, false,
                        () -> changeStatus(item, "resolved")));
                }
                case "in_progress" -> {
                    menu.getItems().add(menuItem(I18n.get("incidents.menu.markResolved"), FontAwesomeSolid.CHECK, false,
                        () -> changeStatus(item, "resolved")));
                    menu.getItems().add(menuItem(I18n.get("incidents.menu.reopen"), FontAwesomeSolid.UNDO, false,
                        () -> changeStatus(item, "open")));
                }
                default -> {
                    menu.getItems().add(menuItem(I18n.get("incidents.menu.reopen"), FontAwesomeSolid.UNDO, false,
                        () -> changeStatus(item, "open")));
                }
            }
        }

        // Delete
        menu.getItems().add(new SeparatorMenuItem());
        menu.getItems().add(menuItem(I18n.get("incidents.menu.delete"), FontAwesomeSolid.TRASH_ALT, true,
            () -> deleteIncident(item)));

        return menu;
    }

    private MenuItem menuItem(String label, FontAwesomeSolid iconCode, boolean danger, Runnable action) {
        FontIcon fi = new FontIcon(iconCode);
        fi.setIconSize(11);
        MenuItem item = new MenuItem(label, fi);
        if (danger) item.getStyleClass().add("menu-item-danger");
        item.setOnAction(e -> action.run());
        return item;
    }

    private VBox buildEmptyPlaceholder() {
        Label lbl = new Label(I18n.get("incidents.empty"));
        lbl.getStyleClass().add("muted-label");
        Label hint = new Label(I18n.get("incidents.emptyHint"));
        hint.getStyleClass().add("caption");
        VBox box = new VBox(6, lbl, hint);
        box.setAlignment(Pos.CENTER);
        return box;
    }

    // ── Filters ──────────────────────────────────────────────────────────────

    private AppButton filterBtn(String label, String filter) {
        AppButton btn = new AppButton(label, AppButton.Variant.GHOST);
        btn.getStyleClass().add("filter-btn");
        btn.setOnAction(e -> {
            activeFilter = filter;
            for (AppButton fb : filterButtons) fb.getStyleClass().remove("filter-btn-active");
            btn.getStyleClass().add("filter-btn-active");
            applyFilter();
        });
        return btn;
    }

    private void applyFilter() {
        String query = searchField.getText().toLowerCase(Locale.FRENCH).trim();
        List<IncidentRepository.Incident> filtered = allIncidents.stream()
            .filter(i -> {
                if ("open".equals(activeFilter)        && !"open".equals(i.status()))        return false;
                if ("in_progress".equals(activeFilter) && !"in_progress".equals(i.status())) return false;
                if ("resolved".equals(activeFilter)    && !"resolved".equals(i.status()))    return false;
                if ("conflict".equals(activeFilter)    && !i.isConflict())                   return false;
                if (!query.isBlank()) {
                    String t = i.title()       != null ? i.title().toLowerCase(Locale.FRENCH)       : "";
                    String d = i.description() != null ? i.description().toLowerCase(Locale.FRENCH) : "";
                    return t.contains(query) || d.contains(query);
                }
                return true;
            })
            .toList();
        table.getItems().setAll(filtered);
        updateFooter(filtered.size());
    }

    private void updateFilterCounts() {
        long total     = allIncidents.size();
        long open      = allIncidents.stream().filter(i -> "open".equals(i.status())).count();
        long inProg    = allIncidents.stream().filter(i -> "in_progress".equals(i.status())).count();
        long resolved  = allIncidents.stream().filter(i -> "resolved".equals(i.status())).count();
        long conflicts = allIncidents.stream().filter(IncidentRepository.Incident::isConflict).count();
        filterButtons[0].setText(I18n.get("incidents.filter.allCount", total));
        filterButtons[1].setText(I18n.get("incidents.filter.openCount", open));
        filterButtons[2].setText(I18n.get("incidents.filter.inProgressCount", inProg));
        filterButtons[3].setText(I18n.get("incidents.filter.resolvedCount", resolved));
        filterButtons[4].setText(I18n.get("incidents.filter.conflictsCount", conflicts));
        filterButtons[4].setVisible(conflicts > 0);
        filterButtons[4].setManaged(conflicts > 0);
        refreshConflictBanner();
    }

    private void updateFooter(int displayed) {
        long conflicts = allIncidents.stream().filter(IncidentRepository.Incident::isConflict).count();
        long dirty     = allIncidents.stream().filter(i -> i.isDirty() && !i.isConflict()).count();
        StringBuilder sb = new StringBuilder();
        sb.append(I18n.get("incidents.footer.count", displayed, allIncidents.size()));
        if (conflicts > 0) sb.append(" ").append(conflicts > 1
                ? I18n.get("incidents.footer.conflictMany", conflicts)
                : I18n.get("incidents.footer.conflictOne", conflicts));
        if (dirty     > 0) sb.append(" ").append(I18n.get("incidents.footer.pendingSync", dirty));
        footerInfo.setText(sb.toString());
    }

    // ── Business logic ────────────────────────────────────────────────────────

    private void changeStatus(IncidentRepository.Incident incident, String newStatus) {
        new Thread(() -> {
            try {
                repo.updateStatusLocally(incident.localId(), newStatus);
                Platform.runLater(() -> { refresh(); notifyLocalChange(); toast.showSuccess(I18n.get("incidents.statusUpdated")); });
            } catch (Exception ex) {
                Platform.runLater(() -> toast.showError(I18n.get("incidents.statusFailed", ex.getMessage())));
                return;
            }
            if (incident.remoteId() != null) {
                try {
                    ApiService.patch("/incidents/" + incident.remoteId(),
                        "{\"status\": \"" + newStatus + "\"}", AuthService.getInstance().getAccessToken());
                } catch (Exception ignored) {}
            }
        }, "incident-status").start();
    }

    private void deleteIncident(IncidentRepository.Incident incident) {
        new Thread(() -> {
            // Best-effort server delete (may 403 for non-moderators — tombstone handles local side)
            if (incident.remoteId() != null) {
                try {
                    ApiService.delete("/incidents/" + incident.remoteId(),
                        AuthService.getInstance().getAccessToken());
                } catch (Exception ignored) {}
            }
            try {
                repo.deleteByLocalId(incident.localId());
                Platform.runLater(() -> { refresh(); notifyLocalChange(); toast.showSuccess(I18n.get("incidents.deleted")); });
            } catch (Exception ex) {
                Platform.runLater(() -> toast.showError(I18n.get("incidents.error", ex.getMessage())));
            }
        }, "incident-delete").start();
    }

    private void resolveConflict(int localId, boolean acceptRemote) {
        try {
            repo.resolveConflict(localId, acceptRemote);
            refresh();
            notifyLocalChange();
            toast.showSuccess(acceptRemote ? I18n.get("incidents.conflict.acceptedRemote") : I18n.get("incidents.conflict.keptLocal"));
        } catch (SQLException e) {
            toast.showError(I18n.get("incidents.conflict.resolveError"));
        }
    }

    // ── Modals ────────────────────────────────────────────────────────────────

    public void openCreateForm() {
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
                appModal.hide(); refresh(); notifyLocalChange();
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

    void openConflictForm(IncidentRepository.Incident item) {
        FontIcon warnIcon = new FontIcon(FontAwesomeSolid.EXCLAMATION_TRIANGLE);
        warnIcon.setIconSize(15);
        warnIcon.getStyleClass().add("conflict-modal-warn-icon");

        Label warnTitle = new Label(I18n.get("incidents.conflict.title"));
        warnTitle.getStyleClass().add("conflict-modal-warn-title");
        Label warnDesc = new Label(I18n.get("incidents.conflict.desc"));
        warnDesc.getStyleClass().add("conflict-modal-warn-desc");
        warnDesc.setWrapText(true);
        VBox warnText = new VBox(2, warnTitle, warnDesc);
        HBox.setHgrow(warnText, Priority.ALWAYS);

        HBox warning = new HBox(10, warnIcon, warnText);
        warning.getStyleClass().add("conflict-warning-header");
        warning.setAlignment(Pos.TOP_LEFT);
        VBox.setMargin(warning, new Insets(0, 0, 14, 0));

        GridPane grid = buildMergeGrid(item);
        VBox.setMargin(grid, new Insets(0, 0, 18, 0));

        FontIcon localIcon = new FontIcon(FontAwesomeSolid.LAPTOP);
        localIcon.setIconSize(12);
        AppButton keepLocalBtn = new AppButton(I18n.get("incidents.conflict.keepLocal"), AppButton.Variant.SECONDARY);
        keepLocalBtn.setGraphic(localIcon);
        keepLocalBtn.setGraphicTextGap(6);
        keepLocalBtn.getStyleClass().add("merge-btn-local");
        keepLocalBtn.setOnAction(e -> { resolveConflict(item.localId(), false); appModal.hide(); });

        FontIcon serverIcon = new FontIcon(FontAwesomeSolid.CLOUD);
        serverIcon.setIconSize(12);
        AppButton keepRemoteBtn = new AppButton(I18n.get("incidents.conflict.acceptServer"), AppButton.Variant.PRIMARY);
        keepRemoteBtn.setGraphic(serverIcon);
        keepRemoteBtn.setGraphicTextGap(6);
        keepRemoteBtn.getStyleClass().add("merge-btn-remote");
        keepRemoteBtn.setOnAction(e -> { resolveConflict(item.localId(), true); appModal.hide(); });

        AppButton cancelBtn = new AppButton(I18n.get("incidents.conflict.later"), AppButton.Variant.GHOST);
        cancelBtn.setOnAction(e -> appModal.hide());

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        HBox buttons = new HBox(8, cancelBtn, spacer, keepLocalBtn, keepRemoteBtn);
        buttons.setAlignment(Pos.CENTER_LEFT);

        VBox content = new VBox(0, warning, grid, buttons);
        appModal.showWide(I18n.get("incidents.conflict.modalTitle"), content);
    }

    private GridPane buildMergeGrid(IncidentRepository.Incident item) {
        GridPane grid = new GridPane();
        grid.getStyleClass().add("merge-grid");
        grid.setHgap(0);
        grid.setVgap(0);

        ColumnConstraints fieldCol = new ColumnConstraints();
        fieldCol.setMinWidth(80);
        fieldCol.setPrefWidth(80);
        fieldCol.setMaxWidth(80);

        ColumnConstraints baseCol = new ColumnConstraints();
        baseCol.setHgrow(Priority.ALWAYS);
        baseCol.setFillWidth(true);

        ColumnConstraints localCol = new ColumnConstraints();
        localCol.setHgrow(Priority.ALWAYS);
        localCol.setFillWidth(true);

        ColumnConstraints remoteCol = new ColumnConstraints();
        remoteCol.setHgrow(Priority.ALWAYS);
        remoteCol.setFillWidth(true);

        grid.getColumnConstraints().addAll(fieldCol, baseCol, localCol, remoteCol);

        addMergeHeader(grid, 0);

        String baseStatus = item.baseStatus();
        String baseTitle  = item.baseTitle();
        String baseDesc   = item.baseDescription();

        boolean statusDiff = !java.util.Objects.equals(item.status(), item.remoteStatus());
        boolean titleDiff  = !java.util.Objects.equals(item.title(), item.remoteTitle());
        boolean descDiff   = !java.util.Objects.equals(item.description(), item.remoteDescription());

        addMergeRowStatus(grid, 1, I18n.get("incidents.merge.status"), baseStatus, item.status(), item.remoteStatus(), statusDiff);
        addMergeRowText(grid, 2, I18n.get("incidents.merge.title"), baseTitle, item.title(), item.remoteTitle(), titleDiff);
        addMergeRowText(grid, 3, I18n.get("incidents.merge.description"), baseDesc, item.description(), item.remoteDescription(), descDiff);

        return grid;
    }

    private void addMergeHeader(GridPane grid, int row) {
        Label fieldH = new Label("");
        fieldH.getStyleClass().add("merge-grid-header");
        fieldH.setMaxWidth(Double.MAX_VALUE);

        FontIcon baseIcon = new FontIcon(FontAwesomeSolid.CODE_BRANCH);
        baseIcon.setIconSize(10);
        baseIcon.getStyleClass().add("merge-header-icon-base");
        Label baseH = new Label(I18n.get("incidents.merge.base"));
        baseH.setGraphic(baseIcon);
        baseH.getStyleClass().add("merge-grid-header");
        baseH.getStyleClass().add("merge-grid-header-base");
        baseH.setMaxWidth(Double.MAX_VALUE);

        FontIcon localIcon = new FontIcon(FontAwesomeSolid.LAPTOP);
        localIcon.setIconSize(10);
        localIcon.getStyleClass().add("merge-header-icon-local");
        Label localH = new Label(I18n.get("incidents.merge.local"));
        localH.setGraphic(localIcon);
        localH.getStyleClass().add("merge-grid-header");
        localH.getStyleClass().add("merge-grid-header-local");
        localH.setMaxWidth(Double.MAX_VALUE);

        FontIcon remoteIcon = new FontIcon(FontAwesomeSolid.CLOUD);
        remoteIcon.setIconSize(10);
        remoteIcon.getStyleClass().add("merge-header-icon-remote");
        Label remoteH = new Label(I18n.get("incidents.merge.server"));
        remoteH.setGraphic(remoteIcon);
        remoteH.getStyleClass().add("merge-grid-header");
        remoteH.getStyleClass().add("merge-grid-header-remote");
        remoteH.setMaxWidth(Double.MAX_VALUE);

        grid.add(fieldH,   0, row);
        grid.add(baseH,    1, row);
        grid.add(localH,   2, row);
        grid.add(remoteH,  3, row);
    }

    private void addMergeRowText(GridPane grid, int row, String fieldName,
                                  String baseVal, String localVal, String remoteVal, boolean isDiff) {
        Label fieldLbl = new Label(fieldName);
        fieldLbl.getStyleClass().add("merge-grid-field");
        fieldLbl.setMaxWidth(Double.MAX_VALUE);

        Label baseLbl = cellLabel(baseVal, "merge-grid-cell", "merge-cell-base");
        Label localLbl = cellLabel(localVal, "merge-grid-cell", "merge-cell-local");
        Label remoteLbl = cellLabel(remoteVal, "merge-grid-cell", "merge-cell-remote");

        if (isDiff) {
            localLbl.getStyleClass().add("merge-cell-changed-local");
            remoteLbl.getStyleClass().add("merge-cell-changed-remote");
        }

        grid.add(fieldLbl,  0, row);
        grid.add(baseLbl,   1, row);
        grid.add(localLbl,  2, row);
        grid.add(remoteLbl, 3, row);
    }

    private void addMergeRowStatus(GridPane grid, int row, String fieldName,
                                    String baseStatus, String localStatus, String remoteStatus, boolean isDiff) {
        Label fieldLbl = new Label(fieldName);
        fieldLbl.getStyleClass().add("merge-grid-field");
        fieldLbl.setMaxWidth(Double.MAX_VALUE);

        HBox baseBox = statusCell(baseStatus, "merge-cell-base");
        HBox localBox = statusCell(localStatus, "merge-cell-local");
        HBox remoteBox = statusCell(remoteStatus, "merge-cell-remote");

        if (isDiff) {
            localBox.getStyleClass().add("merge-cell-changed-local");
            remoteBox.getStyleClass().add("merge-cell-changed-remote");
        }

        grid.add(fieldLbl,  0, row);
        grid.add(baseBox,   1, row);
        grid.add(localBox,  2, row);
        grid.add(remoteBox, 3, row);
    }

    private Label cellLabel(String value, String... styleClasses) {
        Label lbl = new Label(value != null && !value.isBlank() ? value : "—");
        lbl.setWrapText(true);
        lbl.setMaxWidth(Double.MAX_VALUE);
        lbl.getStyleClass().addAll(styleClasses);
        return lbl;
    }

    private HBox statusCell(String status, String styleClass) {
        AppBadge badge = AppBadge.fromStatus(status != null ? status : "open");
        HBox box = new HBox(badge);
        box.setAlignment(Pos.CENTER_LEFT);
        box.getStyleClass().addAll("merge-grid-cell", styleClass);
        box.setMaxWidth(Double.MAX_VALUE);
        return box;
    }

    private void openDetailForm(IncidentRepository.Incident item) {
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
                btn.setOnAction(e -> { changeStatus(item, "in_progress"); appModal.hide(); });
                AppButton btn2 = new AppButton(I18n.get("incidents.detail.toResolved"), AppButton.Variant.SECONDARY);
                btn2.setOnAction(e -> { changeStatus(item, "resolved"); appModal.hide(); });
                statusActions.getChildren().addAll(btn, btn2);
            }
            case "in_progress" -> {
                AppButton btn = new AppButton(I18n.get("incidents.detail.toResolved"), AppButton.Variant.SECONDARY);
                btn.setOnAction(e -> { changeStatus(item, "resolved"); appModal.hide(); });
                AppButton btn2 = new AppButton(I18n.get("incidents.detail.reopen"), AppButton.Variant.SECONDARY);
                btn2.setOnAction(e -> { changeStatus(item, "open"); appModal.hide(); });
                statusActions.getChildren().addAll(btn, btn2);
            }
            default -> {
                AppButton btn = new AppButton(I18n.get("incidents.detail.reopen"), AppButton.Variant.SECONDARY);
                btn.setOnAction(e -> { changeStatus(item, "open"); appModal.hide(); });
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
                        refresh(); notifyLocalChange();
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
