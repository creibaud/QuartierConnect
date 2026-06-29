package fr.quartierconnect.desktopapp.views;

import fr.quartierconnect.desktopapp.database.IncidentRepository;
import fr.quartierconnect.desktopapp.i18n.I18n;
import fr.quartierconnect.desktopapp.services.ApiService;
import fr.quartierconnect.desktopapp.services.AuthService;
import fr.quartierconnect.desktopapp.services.SyncService;
import fr.quartierconnect.desktopapp.services.UninstallService;
import fr.quartierconnect.desktopapp.services.UpdateService;
import fr.quartierconnect.desktopapp.ui.components.AppBadge;
import fr.quartierconnect.desktopapp.ui.components.AppButton;
import fr.quartierconnect.desktopapp.util.TimeFormatter;
import fr.quartierconnect.desktopapp.util.UiHelper;
import javafx.animation.Animation;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonType;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.ScrollPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.util.Duration;

import java.util.Locale;

public class ProfileView {

    private static final long REFRESH_THRESHOLD_SECONDS = 60;
    private static final long TOKEN_LIFETIME_SECONDS = 15 * 60;

    private final Runnable onLogout;
    private final SyncService syncService;
    private final VBox root;

    private Label onlineStatusLabel;
    private Label sessionNetworkLabel;
    private Label lastSyncLabel;
    private Label tokenStatusLabel;
    private Region tokenFill;
    private Timeline tokenCountdownTimer;
    private volatile boolean isRefreshing = false;

    private final UpdateService updateService = new UpdateService();
    private final UninstallService uninstallService = new UninstallService();

    public ProfileView(Runnable onLogout, SyncService syncService) {
        this.onLogout = onLogout;
        this.syncService = syncService;
        this.root = buildLayout();
        startTokenCountdown();
        checkOnlineStatusAsync();
    }

    public VBox getRoot() {
        return root;
    }

    private void checkOnlineStatusAsync() {
        new Thread(() -> {
            boolean online = ApiService.isReachable();
            Platform.runLater(() -> applyOnlineStatus(online));
        }, "profile-online-check").start();
    }

    private void applyOnlineStatus(boolean online) {
        String text = online ? I18n.get("status.apiOnline") : I18n.get("status.apiOffline");
        String css = online ? "status-online" : "status-offline";
        if (onlineStatusLabel != null) {
            onlineStatusLabel.setText(text);
            onlineStatusLabel.getStyleClass().setAll(css);
        }
        if (sessionNetworkLabel != null) {
            sessionNetworkLabel.setText(text);
            sessionNetworkLabel.getStyleClass().setAll(css);
        }
    }

    private VBox buildLayout() {
        Label pageTitle = new Label(I18n.get("profile.title"));
        pageTitle.getStyleClass().add("content-title");

        Label pageSubtitle = new Label(I18n.get("profile.subtitle"));
        pageSubtitle.getStyleClass().add("content-subtitle");

        VBox titleBlock = new VBox(3, pageTitle, pageSubtitle);
        VBox.setMargin(titleBlock, new Insets(0, 0, 16, 0));

        String email = AuthService.getInstance().getCurrentUserEmail();
        String role = AuthService.getInstance().getCurrentUserRole();
        String initials = extractInitials(email);

        Label avatarLbl = new Label(initials);
        avatarLbl.getStyleClass().add("profile-avatar");

        Label emailLbl = new Label(email != null ? email : I18n.get("profile.unknownUser"));
        emailLbl.getStyleClass().add("profile-email-lbl");

        AppBadge roleBadge = buildRoleBadge(role);

        HBox emailRow = new HBox(7, emailLbl, roleBadge);
        emailRow.setAlignment(Pos.CENTER_LEFT);

        onlineStatusLabel = new Label(I18n.get("status.connecting"));
        onlineStatusLabel.getStyleClass().add("status-offline");

        Label connectedSince = new Label(I18n.get("profile.connectedSince"));
        connectedSince.getStyleClass().add("profile-meta-text");

        HBox metaRow = new HBox(8, onlineStatusLabel, connectedSince);
        metaRow.setAlignment(Pos.CENTER_LEFT);

        VBox profileInfo = new VBox(6, emailRow, metaRow);
        profileInfo.setAlignment(Pos.CENTER_LEFT);

        HBox profileHero = new HBox(16, avatarLbl, profileInfo);
        profileHero.setAlignment(Pos.CENTER_LEFT);
        profileHero.getStyleClass().add("profile-hero");
        VBox.setMargin(profileHero, new Insets(0, 0, 9, 0));

        VBox sessionCard = buildSessionCard();
        VBox.setMargin(sessionCard, new Insets(0, 0, 9, 0));

        VBox dbCard = buildLocalDbCard(email);
        VBox.setMargin(dbCard, new Insets(0, 0, 9, 0));

        VBox languageCard = buildLanguageCard();
        VBox.setMargin(languageCard, new Insets(0, 0, 9, 0));

        VBox applicationCard = buildApplicationCard();
        VBox.setMargin(applicationCard, new Insets(0, 0, 14, 0));

        AppButton logoutBtn = new AppButton(I18n.get("profile.logout"), AppButton.Variant.DESTRUCTIVE, true);
        logoutBtn.setOnAction(e -> onLogout.run());

        VBox profileLayout = new VBox(0, profileHero, sessionCard, dbCard, languageCard, applicationCard, logoutBtn);
        profileLayout.setMaxWidth(460);

        VBox centeredProfile = new VBox(profileLayout);
        centeredProfile.setAlignment(Pos.TOP_CENTER);
        VBox.setVgrow(centeredProfile, Priority.ALWAYS);

        ScrollPane scroll = new ScrollPane();
        VBox inner = new VBox(16, titleBlock, centeredProfile);
        inner.setPadding(new Insets(22, 40, 24, 40));
        inner.setAlignment(Pos.TOP_CENTER);
        scroll.setContent(inner);
        scroll.setFitToWidth(true);
        scroll.getStyleClass().add("content-scroll");
        VBox.setVgrow(scroll, Priority.ALWAYS);

        VBox layout = new VBox(0, scroll);
        layout.getStyleClass().add("content-area");
        return layout;
    }

    private VBox buildSessionCard() {
        Label cardTitle = new Label(I18n.get("profile.session"));
        cardTitle.getStyleClass().add("detail-card-title");
        VBox.setMargin(cardTitle, new Insets(0, 0, 12, 0));

        Label networkLbl = new Label(I18n.get("profile.networkStatus"));
        networkLbl.getStyleClass().add("detail-row-lbl");
        sessionNetworkLabel = new Label(I18n.get("status.offline"));
        sessionNetworkLabel.getStyleClass().add("status-offline");
        HBox networkRow = UiHelper.detailRow(networkLbl, sessionNetworkLabel);

        Label syncLbl = new Label(I18n.get("profile.lastSync"));
        syncLbl.getStyleClass().add("detail-row-lbl");
        lastSyncLabel = new Label("—");
        lastSyncLabel.getStyleClass().add("detail-row-val-mono");
        HBox syncRow = UiHelper.detailRow(syncLbl, lastSyncLabel);

        Label tokenLbl = new Label(I18n.get("profile.tokenJwt"));
        tokenLbl.getStyleClass().add("detail-row-lbl");
        tokenStatusLabel = new Label(I18n.get("profile.token.valid"));
        tokenStatusLabel.getStyleClass().add("status-online");
        HBox tokenHeader = UiHelper.detailRow(tokenLbl, tokenStatusLabel);

        Region tokenTrack = new Region();
        tokenTrack.getStyleClass().add("token-bar-bg");
        tokenTrack.setMaxWidth(Double.MAX_VALUE);
        tokenTrack.setPrefHeight(4);
        HBox.setHgrow(tokenTrack, Priority.ALWAYS);

        tokenFill = new Region();
        tokenFill.getStyleClass().add("token-fill-ok");
        tokenFill.setPrefHeight(4);
        tokenFill.setMaxWidth(Double.MAX_VALUE);

        StackPane tokenBarWrap = new StackPane(tokenTrack, tokenFill);
        tokenBarWrap.setAlignment(javafx.geometry.Pos.CENTER_LEFT);
        tokenBarWrap.setMaxWidth(Double.MAX_VALUE);
        VBox.setMargin(tokenBarWrap, new Insets(4, 0, 4, 0));

        Label vaultLbl = new Label(I18n.get("profile.tokenVault"));
        vaultLbl.getStyleClass().add("detail-row-lbl");
        Label vaultVal = new Label("java-keyring · OS keychain");
        vaultVal.getStyleClass().add("detail-row-val-mono");
        HBox vaultRow = UiHelper.detailRow(vaultLbl, vaultVal);

        VBox card = new VBox(0,
            cardTitle,
            networkRow, UiHelper.separator(),
            syncRow, UiHelper.separator(),
            tokenHeader, tokenBarWrap, UiHelper.separator(),
            vaultRow
        );
        card.getStyleClass().add("detail-card");
        return card;
    }

    private VBox buildLocalDbCard(String email) {
        Label cardTitle = new Label(I18n.get("profile.localDb"));
        cardTitle.getStyleClass().add("detail-card-title");
        VBox.setMargin(cardTitle, new Insets(0, 0, 12, 0));

        Label incidentsLbl = new Label(I18n.get("profile.localIncidents"));
        incidentsLbl.getStyleClass().add("detail-row-lbl");
        Label incidentsVal = new Label("—");
        incidentsVal.getStyleClass().add("big-number");
        HBox incidentsRow = UiHelper.detailRow(incidentsLbl, incidentsVal);

        Label conflictsLbl = new Label(I18n.get("profile.pendingConflicts"));
        conflictsLbl.getStyleClass().add("detail-row-lbl");
        Label conflictsVal = new Label("—");
        conflictsVal.getStyleClass().add("big-number-red");
        HBox conflictsRow = UiHelper.detailRow(conflictsLbl, conflictsVal);

        Label pathLbl = new Label(I18n.get("profile.sqlitePath"));
        pathLbl.getStyleClass().add("detail-row-lbl");
        Label pathVal = new Label("quartierconnect.db");
        pathVal.getStyleClass().add("detail-row-val-mono");
        HBox pathRow = UiHelper.detailRow(pathLbl, pathVal);

        Label versionLbl = new Label(I18n.get("profile.version"));
        versionLbl.getStyleClass().add("detail-row-lbl");
        Label versionVal = new Label("v1.4.0 · Java 21 · JavaFX 21");
        versionVal.getStyleClass().add("detail-row-val-mono");
        HBox versionRow = UiHelper.detailRow(versionLbl, versionVal);

        VBox card = new VBox(0,
            cardTitle,
            incidentsRow, UiHelper.separator(),
            conflictsRow, UiHelper.separator(),
            pathRow, UiHelper.separator(),
            versionRow
        );
        card.getStyleClass().add("detail-card");

        loadDbStatsAsync(incidentsVal, conflictsVal);

        return card;
    }

    private VBox buildLanguageCard() {
        Label cardTitle = new Label(I18n.get("profile.language").toUpperCase(Locale.ROOT));
        cardTitle.getStyleClass().add("detail-card-title");
        VBox.setMargin(cardTitle, new Insets(0, 0, 12, 0));

        ComboBox<Locale> languageCombo = new ComboBox<>();
        languageCombo.getItems().addAll(I18n.availableLocales());
        languageCombo.setConverter(new javafx.util.StringConverter<>() {
            @Override public String toString(Locale locale) { return localeDisplayName(locale); }
            @Override public Locale fromString(String value) { return null; }
        });
        languageCombo.setValue(selectedLocale());

        Label restartNote = new Label(I18n.get("profile.language.restartNote"));
        restartNote.getStyleClass().add("content-subtitle");
        restartNote.setWrapText(true);
        restartNote.setVisible(false);
        restartNote.setManaged(false);

        languageCombo.valueProperty().addListener((obs, previous, selected) -> {
            if (selected == null || selected.getLanguage().equals(I18n.getLocale().getLanguage())) return;
            I18n.setLocale(selected);
            restartNote.setVisible(true);
            restartNote.setManaged(true);
        });

        Label languageLbl = new Label(I18n.get("profile.language"));
        languageLbl.getStyleClass().add("detail-row-lbl");
        Region rowSpacer = new Region();
        HBox.setHgrow(rowSpacer, Priority.ALWAYS);
        HBox languageRow = new HBox(languageLbl, rowSpacer, languageCombo);
        languageRow.setAlignment(Pos.CENTER_LEFT);
        languageRow.setPadding(new Insets(7, 0, 7, 0));

        VBox card = new VBox(0, cardTitle, languageRow, restartNote);
        card.getStyleClass().add("detail-card");
        VBox.setMargin(restartNote, new Insets(10, 0, 0, 0));
        return card;
    }

    private VBox buildApplicationCard() {
        Label cardTitle = new Label(I18n.get("profile.app").toUpperCase(Locale.ROOT));
        cardTitle.getStyleClass().add("detail-card-title");
        VBox.setMargin(cardTitle, new Insets(0, 0, 12, 0));

        Label versionLbl = new Label(I18n.get("profile.version"));
        versionLbl.getStyleClass().add("detail-row-lbl");
        Label versionVal = new Label("v" + UpdateService.currentVersion() + " · Java 21 · JavaFX 21");
        versionVal.getStyleClass().add("detail-row-val-mono");
        HBox versionRow = UiHelper.detailRow(versionLbl, versionVal);

        Label updateStatus = new Label(I18n.get("profile.update.idle"));
        updateStatus.getStyleClass().add("profile-meta-text");
        updateStatus.setWrapText(true);
        VBox.setMargin(updateStatus, new Insets(10, 0, 0, 0));

        AppButton updateBtn = new AppButton(I18n.get("profile.update.check"), AppButton.Variant.PRIMARY, true);
        updateBtn.setOnAction(e -> startUpdate(updateBtn, updateStatus));

        AppButton uninstallBtn = new AppButton(I18n.get("profile.uninstall"), AppButton.Variant.DESTRUCTIVE, true);
        uninstallBtn.setOnAction(e -> confirmAndUninstall());

        VBox buttons = new VBox(8, updateBtn, uninstallBtn);
        VBox.setMargin(buttons, new Insets(12, 0, 0, 0));

        VBox card = new VBox(0, cardTitle, versionRow, UiHelper.separator(), updateStatus, buttons);
        card.getStyleClass().add("detail-card");
        return card;
    }

    private void startUpdate(AppButton trigger, Label status) {
        trigger.setDisable(true);
        status.setText(I18n.get("profile.update.checking"));
        new Thread(() -> {
            try {
                updateService.downloadAndInstallLatest(stage ->
                        Platform.runLater(() -> status.setText(I18n.get("profile.update." + stage))));
                Platform.runLater(Platform::exit);
            } catch (Exception ex) {
                Platform.runLater(() -> {
                    status.setText(I18n.get("profile.update.failed", ex.getMessage()));
                    trigger.setDisable(false);
                });
            }
        }, "app-update").start();
    }

    private void confirmAndUninstall() {
        Alert confirm = new Alert(Alert.AlertType.CONFIRMATION,
                I18n.get("profile.uninstall.confirm"), ButtonType.OK, ButtonType.CANCEL);
        confirm.setTitle(I18n.get("profile.uninstall"));
        confirm.setHeaderText(I18n.get("profile.uninstall.confirmTitle"));
        confirm.showAndWait()
                .filter(button -> button == ButtonType.OK)
                .ifPresent(button -> runUninstall());
    }

    private void runUninstall() {
        try {
            uninstallService.uninstall();
            Platform.exit();
        } catch (Exception ex) {
            new Alert(Alert.AlertType.ERROR,
                    I18n.get("profile.uninstall.failed", ex.getMessage()), ButtonType.OK).showAndWait();
        }
    }

    private Locale selectedLocale() {
        String current = I18n.getLocale().getLanguage();
        return I18n.availableLocales().stream()
                .filter(locale -> locale.getLanguage().equals(current))
                .findFirst()
                .orElse(Locale.ENGLISH);
    }

    private String localeDisplayName(Locale locale) {
        if (locale == null) return "";
        String language = locale.getLanguage();
        if (Locale.FRENCH.getLanguage().equals(language)) return I18n.get("profile.language.french");
        if (Locale.ENGLISH.getLanguage().equals(language)) return I18n.get("profile.language.english");
        String name = locale.getDisplayLanguage(locale);
        return name.isEmpty() ? language : Character.toUpperCase(name.charAt(0)) + name.substring(1);
    }

    private void startTokenCountdown() {
        tokenCountdownTimer = new Timeline(
            new KeyFrame(Duration.seconds(1), e -> {
                updateTokenBar();
                refreshSyncLabel();
            })
        );
        tokenCountdownTimer.setCycleCount(Animation.INDEFINITE);
        tokenCountdownTimer.play();
    }

    private void refreshSyncLabel() {
        if (lastSyncLabel == null) return;
        lastSyncLabel.setText(TimeFormatter.formatElapsed(syncService.getLastSyncEpoch()));
    }

    private void updateTokenBar() {
        long exp = AuthService.getInstance().getTokenExpiryEpochSeconds();
        if (exp == 0 || tokenFill == null || tokenStatusLabel == null) return;
        long remaining = exp - System.currentTimeMillis() / 1000;
        double pct = Math.max(0, Math.min(1.0, (double) remaining / TOKEN_LIFETIME_SECONDS));

        if (remaining <= REFRESH_THRESHOLD_SECONDS && !isRefreshing) {
            triggerAutoRefresh();
        }

        String cssClass;
        String statusText;
        if (isRefreshing) {
            cssClass = "token-fill-warn";
            statusText = I18n.get("profile.token.refreshing");
        } else if (remaining <= 0) {
            cssClass = "token-fill-crit";
            statusText = I18n.get("profile.token.expiredRefreshFailed");
        } else if (remaining < REFRESH_THRESHOLD_SECONDS) {
            cssClass = "token-fill-crit";
            statusText = I18n.get("profile.token.refreshIn", remaining);
        } else if (remaining < 120) {
            cssClass = "token-fill-warn";
            statusText = I18n.get("profile.token.expiresIn", remaining);
        } else {
            long minutes = remaining / 60;
            cssClass = "token-fill-ok";
            statusText = I18n.get("profile.token.validExpiresIn", minutes);
        }

        String finalClass = cssClass;
        String finalStatus = statusText;
        double finalPct = pct;
        Platform.runLater(() -> {
            tokenFill.getStyleClass().setAll(finalClass);
            double trackWidth = tokenFill.getParent() != null ? ((StackPane) tokenFill.getParent()).getWidth() : 400;
            tokenFill.setPrefWidth(finalPct * Math.max(trackWidth, 100));
            tokenStatusLabel.setText(finalStatus);
            if (finalClass.equals("token-fill-ok")) {
                tokenStatusLabel.getStyleClass().setAll("status-online");
            } else if (finalClass.equals("token-fill-warn")) {
                tokenStatusLabel.getStyleClass().setAll("status-token-warn");
            } else {
                tokenStatusLabel.getStyleClass().setAll("status-token-critical");
            }
        });
    }

    private void triggerAutoRefresh() {
        isRefreshing = true;
        new Thread(() -> {
            boolean success = AuthService.getInstance().refreshAccessToken();
            isRefreshing = false;
            Platform.runLater(() -> {
                if (success) {
                    checkOnlineStatusAsync();
                }
            });
        }, "token-auto-refresh").start();
    }

    private void loadDbStatsAsync(Label incidentsLbl, Label conflictsLbl) {
        new Thread(() -> {
            try {
                IncidentRepository repo = new IncidentRepository();
                var all = repo.listAll();
                long conflicts = all.stream().filter(IncidentRepository.Incident::isConflict).count();
                Platform.runLater(() -> {
                    incidentsLbl.setText(String.valueOf(all.size()));
                    conflictsLbl.setText(String.valueOf(conflicts));
                });
            } catch (Exception ignored) {}
        }, "profile-db-stats").start();
    }

    private AppBadge buildRoleBadge(String role) {
        return switch (role == null ? "" : role) {
            case "admin" -> new AppBadge(I18n.get("profile.role.admin"), AppBadge.Variant.CONFLICT);
            case "moderator" -> new AppBadge(I18n.get("profile.role.moderator"), AppBadge.Variant.IN_PROGRESS);
            default -> new AppBadge(I18n.get("profile.role.resident"), AppBadge.Variant.RESOLVED);
        };
    }

    private String extractInitials(String email) {
        if (email == null || email.isBlank()) return "?";
        String local = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        String[] parts = local.split("[._-]");
        if (parts.length >= 2) {
            return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
        }
        return local.substring(0, Math.min(2, local.length())).toUpperCase();
    }
}
