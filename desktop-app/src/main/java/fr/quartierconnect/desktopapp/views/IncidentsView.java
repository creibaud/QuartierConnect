package fr.quartierconnect.desktopapp.views;

import fr.quartierconnect.desktopapp.database.IncidentRepository;
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
import fr.quartierconnect.desktopapp.views.incidents.ConflictResolutionForm;
import fr.quartierconnect.desktopapp.views.incidents.IncidentCreateForm;
import fr.quartierconnect.desktopapp.views.incidents.IncidentDetailPane;
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
import javafx.scene.control.TextField;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.layout.VBox;
import org.kordamp.ikonli.fontawesome5.FontAwesomeSolid;
import org.kordamp.ikonli.javafx.FontIcon;

import java.sql.SQLException;
import java.util.List;
import java.util.Locale;
import java.util.logging.Level;
import java.util.logging.Logger;

public class IncidentsView {

    private static final Logger LOG = Logger.getLogger(IncidentsView.class.getName());

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

    private final IncidentCreateForm     createForm;
    private final IncidentDetailPane     detailForm;
    private final ConflictResolutionForm conflictForm;

    public IncidentsView(AppModal appModal, ToastManager toast, SyncService syncService) {
        this.appModal    = appModal;
        this.toast       = toast;
        this.syncService = syncService;
        this.createForm   = new IncidentCreateForm(appModal, toast, repo, this::refresh);
        this.detailForm   = new IncidentDetailPane(appModal, toast, repo, this::changeStatus, this::refresh);
        this.conflictForm = new ConflictResolutionForm(appModal, toast, repo, this::refresh);
        this.root        = buildLayout();
        refresh();
    }

    public VBox getRoot() { return root; }

    // ── Actualisation ────────────────────────────────────────────────────────

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

    // ── Mise en page ─────────────────────────────────────────────────────────

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
        Label footerDb = new Label(I18n.get("db.localName"));
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
        createBtn.setOnAction(e -> createForm.open());

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

        HBox box = new HBox(6, syncBtn, pluginActions, createBtn);
        box.setAlignment(Pos.CENTER_RIGHT);
        return box;
    }

    private void triggerSync(AppButton syncBtn) {
        syncBtn.setDisable(true);
        syncBtn.setText(I18n.get("incidents.syncing"));
        new Thread(() -> {
            boolean ok = false;
            try {
                syncService.syncNowAndWait();
                ok = true;
            } catch (Exception e) {
                LOG.log(Level.FINE, "Manual incident sync failed", e);
            }
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
                .findFirst().ifPresent(conflictForm::open);
        });

        conflictBanner.getChildren().addAll(warnIcon, msg, resolveBtn);
        conflictBanner.setVisible(true);
        conflictBanner.setManaged(true);
    }

    // ── Tableau ──────────────────────────────────────────────────────────────

    private void buildTable() {
        // N°
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

        // État de synchronisation
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
                    if (row.getItem().isConflict()) conflictForm.open(row.getItem());
                    else                            detailForm.open(row.getItem());
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

        // Résolution de conflit — priorité maximale
        if (item.isConflict()) {
            menu.getItems().add(menuItem(I18n.get("incidents.menu.resolveConflict"), FontAwesomeSolid.CODE_BRANCH, false,
                () -> conflictForm.open(item)));
            menu.getItems().add(new SeparatorMenuItem());
        }

        // Modifier
        menu.getItems().add(menuItem(I18n.get("incidents.menu.edit"), FontAwesomeSolid.EDIT, false,
            () -> detailForm.open(item)));

        // Transitions de statut
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

        // Supprimer
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

    // ── Filtres ──────────────────────────────────────────────────────────────

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

    // ── Logique métier ────────────────────────────────────────────────────────

    private void changeStatus(IncidentRepository.Incident incident, String newStatus) {
        new Thread(() -> {
            try {
                repo.updateStatusLocally(incident.localId(), newStatus);
            } catch (Exception ex) {
                Platform.runLater(() -> toast.showError(I18n.get("incidents.statusFailed", ex.getMessage())));
                return;
            }
            Platform.runLater(this::refresh);
            pushStatusChange(incident, newStatus);
        }, "incident-status").start();
    }

    private void pushStatusChange(IncidentRepository.Incident incident, String newStatus) {
        if (incident.remoteId() == null || incident.remoteId().isBlank()) {
            Platform.runLater(() -> toast.showInfo(I18n.get("incidents.statusSavedLocally")));
            return;
        }
        try {
            ApiService.patch("/incidents/" + incident.remoteId() + "/status",
                "{\"status\": \"" + newStatus + "\"}", AuthService.getInstance().getAccessToken());
            Platform.runLater(() -> toast.showSuccess(I18n.get("incidents.statusUpdated")));
        } catch (Exception ex) {
            Platform.runLater(() -> showStatusPushFailure(ex));
        }
    }

    private void showStatusPushFailure(Exception failure) {
        if (isStateMachineRejection(failure)) {
            toast.showError(I18n.get("incidents.statusRejected"));
        } else {
            toast.showInfo(I18n.get("incidents.statusSavedLocally"));
        }
    }

    private static boolean isStateMachineRejection(Exception failure) {
        return failure.getMessage() != null
                && failure.getMessage().equals(I18n.get("common.apiError", 400));
    }

    private void deleteIncident(IncidentRepository.Incident incident) {
        new Thread(() -> {
            // Suppression serveur au mieux (peut renvoyer 403 pour les non-modérateurs — le marqueur gère le côté local)
            if (incident.remoteId() != null) {
                try {
                    ApiService.delete("/incidents/" + incident.remoteId(),
                        AuthService.getInstance().getAccessToken());
                } catch (Exception e) {
                    LOG.log(Level.FINE, "Best-effort server delete failed; local tombstone will sync later", e);
                }
            }
            try {
                repo.deleteByLocalId(incident.localId());
                Platform.runLater(() -> { refresh(); toast.showSuccess(I18n.get("incidents.deleted")); });
            } catch (Exception ex) {
                Platform.runLater(() -> toast.showError(I18n.get("incidents.error", ex.getMessage())));
            }
        }, "incident-delete").start();
    }

}
