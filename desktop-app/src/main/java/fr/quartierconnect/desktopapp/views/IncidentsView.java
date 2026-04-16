package fr.quartierconnect.desktopapp.views;

import fr.quartierconnect.desktopapp.database.IncidentRepository;
import fr.quartierconnect.desktopapp.database.SQLiteDatabase;
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
                    table.setPlaceholder(new Label("Erreur de chargement."))
                );
            }
        }, "incidents-refresh").start();
    }

    // ── Layout ───────────────────────────────────────────────────────────────

    private VBox buildLayout() {
        Label pageTitle = new Label("Incidents");
        pageTitle.getStyleClass().add("content-title");

        Label pageSubtitle = new Label("Gestion locale · sync bidirectionnelle · Three-Way Merge");
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
        AppButton syncBtn = new AppButton("Synchroniser", AppButton.Variant.SECONDARY);
        syncBtn.setGraphic(UiHelper.icon(FontAwesomeSolid.CLOUD_UPLOAD_ALT, 11));
        syncBtn.setGraphicTextGap(6);
        syncBtn.setOnAction(e -> triggerSync(syncBtn));

        AppButton createBtn = new AppButton("Nouvel incident", AppButton.Variant.PRIMARY);
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

        AppButton demoBtn = new AppButton("Démo conflits", AppButton.Variant.SECONDARY);
        demoBtn.setGraphic(UiHelper.icon(FontAwesomeSolid.EXCLAMATION_TRIANGLE, 11));
        demoBtn.setGraphicTextGap(6);
        demoBtn.setOnAction(e -> {
            try {
                SQLiteDatabase.insertDemoConflicts();
                refresh();
                notifyLocalChange();
                toast.showSuccess("2 conflits de démonstration insérés");
            } catch (Exception ex) {
                toast.showError("Erreur — " + ex.getMessage());
            }
        });

        HBox box = new HBox(6, syncBtn, demoBtn, pluginActions, createBtn);
        box.setAlignment(Pos.CENTER_RIGHT);
        return box;
    }

    private void triggerSync(AppButton syncBtn) {
        syncBtn.setDisable(true);
        syncBtn.setText("Sync…");
        new Thread(() -> {
            boolean ok = false;
            try { syncService.syncNowAndWait(); ok = true; } catch (Exception ignored) {}
            final boolean success = ok;
            Platform.runLater(() -> {
                syncBtn.setDisable(false);
                syncBtn.setText("Synchroniser");
                if (success) { toast.showSuccess("Synchronisation réussie"); refresh(); }
                else           toast.showError("Échec de la synchronisation");
            });
        }, "incidents-sync").start();
    }

    private HBox buildFilterRow() {
        searchField.setPromptText("Rechercher…");
        searchField.textProperty().addListener((obs, o, n) -> applyFilter());
        searchField.getStyleClass().add("filter-search");
        HBox.setHgrow(searchField, Priority.ALWAYS);

        filterButtons[0] = filterBtn("Tous",      "all");
        filterButtons[1] = filterBtn("Ouverts",   "open");
        filterButtons[2] = filterBtn("En cours",  "in_progress");
        filterButtons[3] = filterBtn("Résolus",   "resolved");
        filterButtons[4] = filterBtn("⚠ Conflits", "conflict");
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

        Label msg = new Label(conflicts + (conflicts > 1 ? " conflits nécessitent" : " conflit nécessite") + " votre attention");
        msg.getStyleClass().add("conflict-banner-text");
        HBox.setHgrow(msg, Priority.ALWAYS);

        AppButton resolveBtn = new AppButton("Résoudre maintenant", AppButton.Variant.SECONDARY);
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
        TableColumn<IncidentRepository.Incident, String> statusCol = new TableColumn<>("Statut");
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
        TableColumn<IncidentRepository.Incident, IncidentRepository.Incident> titleCol = new TableColumn<>("Titre");
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
                    titleLbl.setText(item.title() != null ? item.title() : "Sans titre");
                    String desc = item.description();
                    if (desc != null && !desc.isBlank()) {
                        descLbl.setText(desc.length() > 80 ? desc.substring(0, 80) + "…" : desc);
                    } else {
                        descLbl.setText("Aucune description");
                    }
                }
            }
        });

        // Sync state
        TableColumn<IncidentRepository.Incident, IncidentRepository.Incident> syncCol = new TableColumn<>("État");
        syncCol.setPrefWidth(90);
        syncCol.setMinWidth(90);
        syncCol.setMaxWidth(90);
        syncCol.setResizable(false);
        syncCol.setCellValueFactory(c -> new javafx.beans.property.SimpleObjectProperty<>(c.getValue()));
        syncCol.setCellFactory(col -> new TableCell<>() {
            @Override protected void updateItem(IncidentRepository.Incident item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) { setGraphic(null); return; }
                if (item.isConflict())     setGraphic(new AppBadge("⚠ Conflit",  AppBadge.Variant.CONFLICT));
                else if (item.isDirty())   setGraphic(new AppBadge("↑ En attente", AppBadge.Variant.DIRTY));
                else                       setGraphic(null);
            }
        });

        // Date
        TableColumn<IncidentRepository.Incident, String> dateCol = new TableColumn<>("Modifié");
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
            menu.getItems().add(menuItem("Résoudre le conflit", FontAwesomeSolid.CODE_BRANCH, false,
                () -> openConflictForm(item)));
            menu.getItems().add(new SeparatorMenuItem());
        }

        // Edit
        menu.getItems().add(menuItem("Modifier", FontAwesomeSolid.EDIT, false,
            () -> openDetailForm(item)));

        // Status transitions
        if (!item.isConflict()) {
            menu.getItems().add(new SeparatorMenuItem());

            switch (item.status()) {
                case "open" -> {
                    menu.getItems().add(menuItem("Mettre en cours", FontAwesomeSolid.ARROW_RIGHT, false,
                        () -> changeStatus(item, "in_progress")));
                    menu.getItems().add(menuItem("Marquer résolu", FontAwesomeSolid.CHECK, false,
                        () -> changeStatus(item, "resolved")));
                }
                case "in_progress" -> {
                    menu.getItems().add(menuItem("Marquer résolu", FontAwesomeSolid.CHECK, false,
                        () -> changeStatus(item, "resolved")));
                    menu.getItems().add(menuItem("Réouvrir", FontAwesomeSolid.UNDO, false,
                        () -> changeStatus(item, "open")));
                }
                default -> {
                    menu.getItems().add(menuItem("Réouvrir", FontAwesomeSolid.UNDO, false,
                        () -> changeStatus(item, "open")));
                }
            }
        }

        // Delete
        menu.getItems().add(new SeparatorMenuItem());
        menu.getItems().add(menuItem("Supprimer", FontAwesomeSolid.TRASH_ALT, true,
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
        Label lbl = new Label("Aucun incident");
        lbl.getStyleClass().add("muted-label");
        Label hint = new Label("Créez un incident ou lancez une synchronisation.");
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
        filterButtons[0].setText("Tous · " + total);
        filterButtons[1].setText("Ouverts · " + open);
        filterButtons[2].setText("En cours · " + inProg);
        filterButtons[3].setText("Résolus · " + resolved);
        filterButtons[4].setText("⚠ Conflits · " + conflicts);
        filterButtons[4].setVisible(conflicts > 0);
        filterButtons[4].setManaged(conflicts > 0);
        refreshConflictBanner();
    }

    private void updateFooter(int displayed) {
        long conflicts = allIncidents.stream().filter(IncidentRepository.Incident::isConflict).count();
        long dirty     = allIncidents.stream().filter(i -> i.isDirty() && !i.isConflict()).count();
        StringBuilder sb = new StringBuilder();
        sb.append(displayed).append(" / ").append(allIncidents.size()).append(" incidents");
        if (conflicts > 0) sb.append(" · ").append(conflicts).append(conflicts > 1 ? " conflits" : " conflit");
        if (dirty     > 0) sb.append(" · ").append(dirty).append(" en attente de sync");
        footerInfo.setText(sb.toString());
    }

    // ── Business logic ────────────────────────────────────────────────────────

    private void changeStatus(IncidentRepository.Incident incident, String newStatus) {
        new Thread(() -> {
            try {
                repo.updateStatusLocally(incident.localId(), newStatus);
                Platform.runLater(() -> { refresh(); notifyLocalChange(); toast.showSuccess("Statut mis à jour"); });
            } catch (Exception ex) {
                Platform.runLater(() -> toast.showError("Impossible — " + ex.getMessage()));
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
                Platform.runLater(() -> { refresh(); notifyLocalChange(); toast.showSuccess("Incident supprimé"); });
            } catch (Exception ex) {
                Platform.runLater(() -> toast.showError("Erreur — " + ex.getMessage()));
            }
        }, "incident-delete").start();
    }

    private void resolveConflict(int localId, boolean acceptRemote) {
        try {
            repo.resolveConflict(localId, acceptRemote);
            refresh();
            notifyLocalChange();
            toast.showSuccess(acceptRemote ? "Version serveur acceptée" : "Version locale conservée");
        } catch (SQLException e) {
            toast.showError("Erreur de résolution");
        }
    }

    // ── Modals ────────────────────────────────────────────────────────────────

    public void openCreateForm() {
        Label titleLbl = new Label("TITRE *");
        titleLbl.getStyleClass().add("detail-card-title");
        VBox.setMargin(titleLbl, new Insets(6, 0, 8, 0));
        TextField titleField = new TextField();
        titleField.setPromptText("Ex : Nid de poule rue Victor Hugo");

        Label descLbl = new Label("DESCRIPTION");
        descLbl.getStyleClass().add("detail-card-title");
        VBox.setMargin(descLbl, new Insets(16, 0, 8, 0));
        TextArea descField = new TextArea();
        descField.setPromptText("Décrivez le problème…");
        descField.setPrefRowCount(4);
        descField.setWrapText(true);

        Label errorMsg = new Label();
        errorMsg.getStyleClass().add("error-label");
        errorMsg.setVisible(false);
        errorMsg.setManaged(false);

        Label infoNote = new Label("Sauvegardé localement · synchronisé au prochain cycle.");
        infoNote.getStyleClass().add("content-subtitle");
        VBox.setMargin(infoNote, new Insets(10, 0, 0, 0));

        AppButton submitBtn = new AppButton("Créer", AppButton.Variant.PRIMARY);
        AppButton cancelBtn = new AppButton("Annuler", AppButton.Variant.GHOST);
        cancelBtn.setOnAction(e -> appModal.hide());

        submitBtn.setOnAction(e -> {
            String t = titleField.getText().trim();
            if (t.isEmpty()) {
                errorMsg.setText("Le titre est obligatoire.");
                errorMsg.setVisible(true); errorMsg.setManaged(true);
                return;
            }
            if (t.length() > 200) {
                errorMsg.setText("Le titre ne peut pas dépasser 200 caractères.");
                errorMsg.setVisible(true); errorMsg.setManaged(true);
                return;
            }
            if (descField.getText().trim().length() > 2000) {
                errorMsg.setText("La description ne peut pas dépasser 2000 caractères.");
                errorMsg.setVisible(true); errorMsg.setManaged(true);
                return;
            }
            try {
                repo.insertDirty(t, descField.getText().trim());
                appModal.hide(); refresh(); notifyLocalChange();
                toast.showSuccess("Incident créé");
            } catch (SQLException ex) {
                errorMsg.setText("Erreur — réessayez.");
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
        appModal.show("Nouvel incident", content);
    }

    void openConflictForm(IncidentRepository.Incident item) {
        FontIcon warnIcon = new FontIcon(FontAwesomeSolid.EXCLAMATION_TRIANGLE);
        warnIcon.setIconSize(15);
        warnIcon.getStyleClass().add("conflict-modal-warn-icon");

        Label warnTitle = new Label("Conflit de synchronisation");
        warnTitle.getStyleClass().add("conflict-modal-warn-title");
        Label warnDesc = new Label(
            "Les versions locale et serveur ont divergé depuis la base commune. "
            + "Les champs modifiés sont surlignés.");
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
        AppButton keepLocalBtn = new AppButton("Garder locale", AppButton.Variant.SECONDARY);
        keepLocalBtn.setGraphic(localIcon);
        keepLocalBtn.setGraphicTextGap(6);
        keepLocalBtn.getStyleClass().add("merge-btn-local");
        keepLocalBtn.setOnAction(e -> { resolveConflict(item.localId(), false); appModal.hide(); });

        FontIcon serverIcon = new FontIcon(FontAwesomeSolid.CLOUD);
        serverIcon.setIconSize(12);
        AppButton keepRemoteBtn = new AppButton("Accepter serveur", AppButton.Variant.PRIMARY);
        keepRemoteBtn.setGraphic(serverIcon);
        keepRemoteBtn.setGraphicTextGap(6);
        keepRemoteBtn.getStyleClass().add("merge-btn-remote");
        keepRemoteBtn.setOnAction(e -> { resolveConflict(item.localId(), true); appModal.hide(); });

        AppButton cancelBtn = new AppButton("Plus tard", AppButton.Variant.GHOST);
        cancelBtn.setOnAction(e -> appModal.hide());

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        HBox buttons = new HBox(8, cancelBtn, spacer, keepLocalBtn, keepRemoteBtn);
        buttons.setAlignment(Pos.CENTER_LEFT);

        VBox content = new VBox(0, warning, grid, buttons);
        appModal.showWide("Résolution de conflit — Three-Way Merge", content);
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

        addMergeRowStatus(grid, 1, "Statut", baseStatus, item.status(), item.remoteStatus(), statusDiff);
        addMergeRowText(grid, 2, "Titre", baseTitle, item.title(), item.remoteTitle(), titleDiff);
        addMergeRowText(grid, 3, "Description", baseDesc, item.description(), item.remoteDescription(), descDiff);

        return grid;
    }

    private void addMergeHeader(GridPane grid, int row) {
        Label fieldH = new Label("");
        fieldH.getStyleClass().add("merge-grid-header");
        fieldH.setMaxWidth(Double.MAX_VALUE);

        FontIcon baseIcon = new FontIcon(FontAwesomeSolid.CODE_BRANCH);
        baseIcon.setIconSize(10);
        baseIcon.getStyleClass().add("merge-header-icon-base");
        Label baseH = new Label("  Base (ancêtre)");
        baseH.setGraphic(baseIcon);
        baseH.getStyleClass().add("merge-grid-header");
        baseH.getStyleClass().add("merge-grid-header-base");
        baseH.setMaxWidth(Double.MAX_VALUE);

        FontIcon localIcon = new FontIcon(FontAwesomeSolid.LAPTOP);
        localIcon.setIconSize(10);
        localIcon.getStyleClass().add("merge-header-icon-local");
        Label localH = new Label("  Locale");
        localH.setGraphic(localIcon);
        localH.getStyleClass().add("merge-grid-header");
        localH.getStyleClass().add("merge-grid-header-local");
        localH.setMaxWidth(Double.MAX_VALUE);

        FontIcon remoteIcon = new FontIcon(FontAwesomeSolid.CLOUD);
        remoteIcon.setIconSize(10);
        remoteIcon.getStyleClass().add("merge-header-icon-remote");
        Label remoteH = new Label("  Serveur");
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
        Label titleSec = new Label("TITRE");
        titleSec.getStyleClass().add("detail-card-title");
        VBox.setMargin(titleSec, new Insets(10, 0, 8, 0));
        TextField titleField = new TextField(item.title() != null ? item.title() : "");

        Label statusSec = new Label("STATUT");
        statusSec.getStyleClass().add("detail-card-title");
        VBox.setMargin(statusSec, new Insets(18, 0, 8, 0));

        AppBadge statusBadge = AppBadge.fromStatus(item.status());
        VBox.setMargin(statusBadge, new Insets(0, 0, 8, 0));

        HBox statusActions = new HBox(6);
        statusActions.setAlignment(Pos.CENTER_LEFT);
        switch (item.status()) {
            case "open" -> {
                AppButton btn = new AppButton("→ En cours", AppButton.Variant.SECONDARY);
                btn.setOnAction(e -> { changeStatus(item, "in_progress"); appModal.hide(); });
                AppButton btn2 = new AppButton("→ Résolu", AppButton.Variant.SECONDARY);
                btn2.setOnAction(e -> { changeStatus(item, "resolved"); appModal.hide(); });
                statusActions.getChildren().addAll(btn, btn2);
            }
            case "in_progress" -> {
                AppButton btn = new AppButton("→ Résolu", AppButton.Variant.SECONDARY);
                btn.setOnAction(e -> { changeStatus(item, "resolved"); appModal.hide(); });
                AppButton btn2 = new AppButton("← Réouvrir", AppButton.Variant.SECONDARY);
                btn2.setOnAction(e -> { changeStatus(item, "open"); appModal.hide(); });
                statusActions.getChildren().addAll(btn, btn2);
            }
            default -> {
                AppButton btn = new AppButton("← Réouvrir", AppButton.Variant.SECONDARY);
                btn.setOnAction(e -> { changeStatus(item, "open"); appModal.hide(); });
                statusActions.getChildren().add(btn);
            }
        }

        Region divider = UiHelper.separator();
        VBox.setMargin(divider, new Insets(16, 0, 16, 0));

        Label descSec = new Label("DESCRIPTION");
        descSec.getStyleClass().add("detail-card-title");
        VBox.setMargin(descSec, new Insets(0, 0, 8, 0));
        TextArea descField = new TextArea(item.description() != null ? item.description() : "");
        descField.setWrapText(true);
        descField.setPrefRowCount(4);

        Label syncInfo = new Label(buildSyncInfoText(item));
        syncInfo.getStyleClass().add("content-subtitle");
        VBox.setMargin(syncInfo, new Insets(14, 0, 0, 0));

        AppButton saveBtn  = new AppButton("Enregistrer", AppButton.Variant.PRIMARY);
        AppButton closeBtn = new AppButton("Fermer", AppButton.Variant.GHOST);
        closeBtn.setOnAction(e -> appModal.hide());

        saveBtn.setOnAction(e -> {
            String t = titleField.getText().trim();
            if (t.isEmpty()) { toast.showError("Le titre est obligatoire."); return; }
            if (t.length() > 200) { toast.showError("Titre trop long (200 caractères max)."); return; }
            if (descField.getText().trim().length() > 2000) { toast.showError("Description trop longue (2000 caractères max)."); return; }
            new Thread(() -> {
                try {
                    repo.updateLocally(item.localId(), t, descField.getText().trim(), item.status());
                    Platform.runLater(() -> {
                        refresh(); notifyLocalChange();
                        toast.showSuccess("Modifications enregistrées"); appModal.hide();
                    });
                } catch (Exception ex) {
                    Platform.runLater(() -> toast.showError("Erreur — " + ex.getMessage()));
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
        appModal.show("Modifier — " + item.title(), content);
    }

    private String buildSyncInfoText(IncidentRepository.Incident item) {
        StringBuilder sb = new StringBuilder();
        sb.append(item.isDirty()    ? "↑ En attente de sync" : "✓ Synchronisé");
        if (item.isConflict()) sb.append(" · ⚠ Conflit");
        if (item.remoteId() != null) sb.append(" · remote " + item.remoteId().substring(0, Math.min(8, item.remoteId().length())) + "…");
        return sb.toString();
    }

}
