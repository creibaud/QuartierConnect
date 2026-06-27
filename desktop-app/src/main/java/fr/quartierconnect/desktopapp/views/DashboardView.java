package fr.quartierconnect.desktopapp.views;

import fr.quartierconnect.desktopapp.database.IncidentRepository;
import fr.quartierconnect.desktopapp.i18n.I18n;
import fr.quartierconnect.desktopapp.ui.components.AppBadge;
import fr.quartierconnect.desktopapp.ui.components.AppButton;
import fr.quartierconnect.desktopapp.ui.components.EmptyState;
import fr.quartierconnect.desktopapp.ui.components.StatCard;
import fr.quartierconnect.desktopapp.services.SyncService;
import fr.quartierconnect.desktopapp.util.UiHelper;
import fr.quartierconnect.desktopapp.ui.components.ToastManager;
import fr.quartierconnect.desktopapp.util.TimeFormatter;
import javafx.animation.Animation;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.application.Platform;
import javafx.beans.property.SimpleDoubleProperty;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Label;
import javafx.scene.control.ScrollPane;
import javafx.scene.layout.ColumnConstraints;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.layout.VBox;
import org.kordamp.ikonli.fontawesome5.FontAwesomeSolid;
import java.sql.SQLException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.function.Consumer;

public class DashboardView {

    private static final DateTimeFormatter TIME_FMT =
            DateTimeFormatter.ofPattern("dd/MM HH:mm").withZone(ZoneId.systemDefault());

    private final Consumer<String> navigateTo;
    private final SyncService      syncService;
    private final ToastManager     toast;
    private Timeline syncLabelTimer;
    private final IncidentRepository incidentRepo = new IncidentRepository();
    private final VBox root;

    private final StatCard totalCard      = new StatCard(I18n.get("dashboard.stat.totalLocal"),  StatCard.Accent.MUTED);
    private final StatCard openCard       = new StatCard(I18n.get("dashboard.stat.open"),        StatCard.Accent.AMBER);
    private final StatCard inProgressCard = new StatCard(I18n.get("dashboard.stat.inProgress"),  StatCard.Accent.BLUE);
    private final StatCard conflictsCard  = new StatCard(I18n.get("dashboard.stat.conflicts"),   StatCard.Accent.RED);

    private final VBox  recentContainer = new VBox(0);
    private final Label lastSyncLabel   = new Label(I18n.get("time.never"));
    private final Label dirtyLabel      = new Label("—");

    // Breakdown bar — proportions bound to actual container width
    private final HBox barContainer = new HBox(0);
    private final Region openBar       = new Region();
    private final Region inProgressBar = new Region();
    private final Region resolvedBar   = new Region();
    private final Region conflictBar   = new Region();

    private final SimpleDoubleProperty openRatio       = new SimpleDoubleProperty(0);
    private final SimpleDoubleProperty inProgressRatio = new SimpleDoubleProperty(0);
    private final SimpleDoubleProperty resolvedRatio   = new SimpleDoubleProperty(0);
    private final SimpleDoubleProperty conflictRatio   = new SimpleDoubleProperty(0);

    public DashboardView(Consumer<String> navigateTo, SyncService syncService, ToastManager toast) {
        this.navigateTo  = navigateTo;
        this.syncService = syncService;
        this.toast       = toast;
        this.root        = buildLayout();
        loadAsync();
        startSyncLabelTimer();
    }

    public VBox getRoot() {
        return root;
    }

    private void startSyncLabelTimer() {
        syncLabelTimer = new Timeline(
            new KeyFrame(javafx.util.Duration.seconds(1), e -> refreshSyncLabel())
        );
        syncLabelTimer.setCycleCount(Animation.INDEFINITE);
        syncLabelTimer.play();
    }

    private void refreshSyncLabel() {
        lastSyncLabel.setText(TimeFormatter.formatElapsed(syncService.getLastSyncEpoch()));
    }

    // ── Layout ───────────────────────────────────────────────────────────────

    private VBox buildLayout() {
        VBox scrollContent = new VBox(0,
            buildHeader(),
            buildSyncCard(),
            buildStatsGrid(),
            buildBreakdownBar(),
            buildRecentSection()
        );
        scrollContent.setPadding(new Insets(22, 22, 22, 22));

        ScrollPane scroll = new ScrollPane(scrollContent);
        scroll.setFitToWidth(true);
        scroll.getStyleClass().add("content-scroll");
        VBox.setVgrow(scroll, Priority.ALWAYS);

        VBox layout = new VBox(0, scroll);
        layout.getStyleClass().add("content-area");
        return layout;
    }

    private HBox buildHeader() {
        Label pageTitle = new Label(I18n.get("dashboard.title"));
        pageTitle.getStyleClass().add("content-title");

        Label pageSubtitle = new Label(I18n.get("dashboard.subtitle"));
        pageSubtitle.getStyleClass().add("content-subtitle");

        VBox titleBlock = new VBox(3, pageTitle, pageSubtitle);

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        AppButton incidentsBtn = new AppButton(I18n.get("dashboard.viewIncidents"), AppButton.Variant.SECONDARY);
        incidentsBtn.setGraphic(UiHelper.icon(FontAwesomeSolid.CLIPBOARD_LIST, 12));
        incidentsBtn.setGraphicTextGap(6);
        incidentsBtn.setOnAction(e -> navigateTo.accept("incidents"));

        HBox header = new HBox(titleBlock, spacer, incidentsBtn);
        header.setAlignment(Pos.CENTER_LEFT);
        VBox.setMargin(header, new Insets(0, 0, 16, 0));
        return header;
    }

    private HBox buildSyncCard() {
        Label syncKey = new Label(I18n.get("dashboard.lastSync"));
        syncKey.getStyleClass().add("sync-card-key");
        lastSyncLabel.getStyleClass().add("sync-card-val");
        VBox syncBlock = new VBox(2, syncKey, lastSyncLabel);

        Region sep = new Region();
        sep.getStyleClass().add("sync-card-sep");

        Label dirtyKey = new Label(I18n.get("dashboard.notSynced"));
        dirtyKey.getStyleClass().add("sync-card-key");
        dirtyLabel.getStyleClass().add("sync-card-val");
        VBox dirtyBlock = new VBox(2, dirtyKey, dirtyLabel);

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        AppButton syncBtn = new AppButton(I18n.get("dashboard.sync"), AppButton.Variant.PRIMARY);
        syncBtn.setGraphic(UiHelper.icon(FontAwesomeSolid.SYNC_ALT, 12));
        syncBtn.setGraphicTextGap(6);
        syncBtn.setOnAction(e -> triggerSync(syncBtn));

        HBox card = new HBox(16, syncBlock, sep, dirtyBlock, spacer, syncBtn);
        card.setAlignment(Pos.CENTER_LEFT);
        card.getStyleClass().add("sync-card");
        VBox.setMargin(card, new Insets(0, 0, 14, 0));
        return card;
    }

    private void triggerSync(AppButton syncBtn) {
        syncBtn.setDisable(true);
        syncBtn.setGraphic(UiHelper.icon(FontAwesomeSolid.CIRCLE_NOTCH, 12));
        syncBtn.setText(I18n.get("dashboard.syncing"));

        new Thread(() -> {
            boolean success = false;
            try {
                syncService.syncNowAndWait();
                success = true;
            } catch (Exception ignored) {}

            final boolean ok = success;
            Platform.runLater(() -> {
                syncBtn.setDisable(false);
                syncBtn.setText(I18n.get("dashboard.sync"));
                syncBtn.setGraphic(UiHelper.icon(FontAwesomeSolid.SYNC_ALT, 12));
                if (ok) {
                    toast.showSuccess(I18n.get("dashboard.syncSuccess"));
                    loadAsync();
                } else {
                    toast.showError(I18n.get("dashboard.syncFailed"));
                }
            });
        }, "manual-sync").start();
    }

    private GridPane buildStatsGrid() {
        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);

        ColumnConstraints cc = new ColumnConstraints();
        cc.setHgrow(Priority.ALWAYS);
        cc.setFillWidth(true);
        grid.getColumnConstraints().addAll(cc, cc, cc, cc);

        grid.add(totalCard,      0, 0);
        grid.add(openCard,       1, 0);
        grid.add(inProgressCard, 2, 0);
        grid.add(conflictsCard,  3, 0);
        return grid;
    }

    private VBox buildBreakdownBar() {
        openBar.setStyle("-fx-background-color: #b45309; -fx-background-radius: 4 0 0 4;");
        openBar.setPrefHeight(6);

        inProgressBar.setStyle("-fx-background-color: #2563eb;");
        inProgressBar.setPrefHeight(6);

        resolvedBar.setStyle("-fx-background-color: #15803d;");
        resolvedBar.setPrefHeight(6);

        conflictBar.setStyle("-fx-background-color: #dc2626; -fx-background-radius: 0 4 4 0;");
        conflictBar.setPrefHeight(6);

        // Bind each segment's width to the container's actual width × its ratio
        // This ensures correct proportions regardless of when layout runs
        openBar.prefWidthProperty().bind(barContainer.widthProperty().multiply(openRatio));
        inProgressBar.prefWidthProperty().bind(barContainer.widthProperty().multiply(inProgressRatio));
        resolvedBar.prefWidthProperty().bind(barContainer.widthProperty().multiply(resolvedRatio));
        conflictBar.prefWidthProperty().bind(barContainer.widthProperty().multiply(conflictRatio));

        barContainer.setMaxWidth(Double.MAX_VALUE);
        barContainer.getChildren().addAll(openBar, inProgressBar, resolvedBar, conflictBar);
        HBox.setHgrow(barContainer, Priority.ALWAYS);

        HBox legend = new HBox(14,
            legendDot("#b45309", I18n.get("dashboard.legend.open")),
            legendDot("#2563eb", I18n.get("dashboard.legend.inProgress")),
            legendDot("#15803d", I18n.get("dashboard.legend.resolved")),
            legendDot("#dc2626", I18n.get("dashboard.legend.conflicts"))
        );
        legend.setAlignment(Pos.CENTER_LEFT);

        VBox box = new VBox(5, barContainer, legend);
        VBox.setMargin(box, new Insets(10, 0, 0, 0));
        return box;
    }

    private Label legendDot(String color, String text) {
        Label lbl = new Label("● " + text);
        lbl.setStyle("-fx-font-size: 10.5px; -fx-text-fill: " + color + ";");
        return lbl;
    }

    private VBox buildRecentSection() {
        Label recentLabel = new Label(I18n.get("dashboard.recent"));
        recentLabel.getStyleClass().add("section-label");
        VBox.setMargin(recentLabel, new Insets(20, 0, 8, 0));

        HBox recentHead = new HBox();
        recentHead.getStyleClass().add("recent-card-head");
        Label recentTitle = new Label(I18n.get("dashboard.reports"));
        recentTitle.getStyleClass().add("recent-card-title");

        Region headSpacer = new Region();
        HBox.setHgrow(headSpacer, Priority.ALWAYS);

        AppButton viewAllBtn = new AppButton(I18n.get("dashboard.viewAll"), AppButton.Variant.GHOST);
        viewAllBtn.setOnAction(e -> navigateTo.accept("incidents"));
        viewAllBtn.setStyle("-fx-font-size: 11px; -fx-padding: 2 6;");

        recentHead.getChildren().addAll(recentTitle, headSpacer, viewAllBtn);

        VBox recentCard = new VBox(0, recentHead, recentContainer);
        recentCard.getStyleClass().add("recent-card");

        VBox section = new VBox(0, recentLabel, recentCard);
        VBox.setMargin(section, new Insets(0, 0, 8, 0));
        return section;
    }

    // ── Data loading ─────────────────────────────────────────────────────────

    private void loadAsync() {
        new Thread(() -> {
            List<IncidentRepository.Incident> all;
            try {
                all = incidentRepo.listAll();
            } catch (SQLException e) {
                all = List.of();
            }

            long total      = all.size();
            long open       = all.stream().filter(i -> "open".equals(i.status())).count();
            long inProgress = all.stream().filter(i -> "in_progress".equals(i.status())).count();
            long resolved   = all.stream().filter(i -> "resolved".equals(i.status()) || "closed".equals(i.status())).count();
            long conflicts  = all.stream().filter(IncidentRepository.Incident::isConflict).count();
            long dirty      = all.stream().filter(i -> i.isDirty() || i.isConflict()).count();
            double tot      = Math.max(1, open + inProgress + resolved + conflicts);

            List<IncidentRepository.Incident> recent = total > 8 ? all.subList(0, 8) : all;

            Platform.runLater(() -> {
                totalCard.setValue(String.valueOf(total));
                openCard.setValue(String.valueOf(open));
                inProgressCard.setValue(String.valueOf(inProgress));
                conflictsCard.setValue(String.valueOf(conflicts));
                dirtyLabel.setText(String.valueOf(dirty));

                openRatio.set(open / tot);
                inProgressRatio.set(inProgress / tot);
                resolvedRatio.set(resolved / tot);
                conflictRatio.set(conflicts / tot);

                renderRecent(recent);
            });
        }, "dashboard-load").start();
    }

    private void renderRecent(List<IncidentRepository.Incident> incidents) {
        recentContainer.getChildren().clear();
        if (incidents.isEmpty()) {
            recentContainer.getChildren().add(
                new EmptyState(I18n.get("dashboard.empty.title"), I18n.get("dashboard.empty.subtitle"))
            );
            return;
        }
        for (IncidentRepository.Incident i : incidents) {
            recentContainer.getChildren().add(buildRecentRow(i));
        }
    }

    private HBox buildRecentRow(IncidentRepository.Incident i) {
        AppBadge statusBadge = AppBadge.fromStatus(i.status());

        Label titleLbl = new Label(i.title());
        titleLbl.getStyleClass().add("recent-row-title");
        HBox.setHgrow(titleLbl, Priority.ALWAYS);
        titleLbl.setMaxWidth(Double.MAX_VALUE);

        Label timeLbl = new Label(formatTimestamp(i.updatedAt()));
        timeLbl.setStyle("-fx-font-size: 10px; -fx-text-fill: #a1a1aa;");

        HBox row = new HBox(9, statusBadge, titleLbl, timeLbl);
        row.setAlignment(Pos.CENTER_LEFT);
        row.getStyleClass().add("recent-row");
        row.setOnMouseClicked(e -> navigateTo.accept("incidents"));

        if (i.isConflict()) {
            Label conflictTag = new Label(I18n.get("dashboard.conflictTag"));
            conflictTag.setStyle("-fx-font-size: 9.5px; -fx-text-fill: #dc2626; "
                    + "-fx-background-color: rgba(220,38,38,0.12); -fx-padding: 1 5; "
                    + "-fx-background-radius: 4;");
            row.getChildren().add(conflictTag);
        }
        return row;
    }

    private String formatTimestamp(String iso) {
        if (iso == null || iso.isBlank()) return "";
        try {
            return TIME_FMT.format(Instant.parse(iso));
        } catch (Exception e) {
            return iso.length() > 16 ? iso.substring(0, 16).replace("T", " ") : iso;
        }
    }
}
