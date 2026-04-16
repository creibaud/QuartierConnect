package fr.quartierconnect.desktopapp.ui.layout;

import javafx.animation.KeyFrame;
import javafx.animation.KeyValue;
import javafx.animation.Timeline;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Cursor;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.Tooltip;
import javafx.scene.effect.ColorAdjust;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.util.Duration;
import org.kordamp.ikonli.Ikon;
import org.kordamp.ikonli.fontawesome5.FontAwesomeSolid;
import org.kordamp.ikonli.javafx.FontIcon;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class AppSidebar extends VBox {

    private static final double EXPANDED  = 220;
    private static final double COLLAPSED = 56;
    private static final Duration ANIM    = Duration.millis(180);

    private boolean isCollapsed = false;

    private final List<NavItem> allItems = new ArrayList<>();
    private final VBox navList           = new VBox(2);
    private final HBox logoArea;
    private final HBox header;
    private final FontIcon toggleIcon;

    public AppSidebar() {
        getStyleClass().add("app-sidebar");
        setPrefWidth(EXPANDED);
        setMinWidth(EXPANDED);
        setMaxWidth(EXPANDED);

        // ── Logo image ──────────────────────────────────────────────────────
        ImageView logoImg = new ImageView();
        try {
            Image img = new Image(
                Objects.requireNonNull(
                    getClass().getResourceAsStream("/images/logo.png")
                )
            );
            logoImg.setImage(img);
        } catch (Exception ignored) {}
        logoImg.setFitWidth(24);
        logoImg.setFitHeight(24);
        logoImg.setPreserveRatio(true);
        logoImg.setSmooth(true);
        // Logo is black on transparent — invert to white for dark theme
        ColorAdjust whiten = new ColorAdjust();
        whiten.setBrightness(1.0);
        logoImg.setEffect(whiten);

        Label appName = new Label("QuartierConnect");
        appName.getStyleClass().add("sidebar-app-name");

        // logoArea hidden when collapsed
        logoArea = new HBox(10, logoImg, appName);
        logoArea.setAlignment(Pos.CENTER_LEFT);
        HBox.setHgrow(logoArea, Priority.ALWAYS);

        // ── Toggle button (always visible) ─────────────────────────────────
        toggleIcon = new FontIcon(FontAwesomeSolid.ANGLE_LEFT);
        toggleIcon.setIconSize(12);

        Button toggleBtn = new Button();
        toggleBtn.setGraphic(toggleIcon);
        toggleBtn.getStyleClass().add("sidebar-toggle-btn");
        toggleBtn.setOnAction(e -> toggleCollapse());

        // ── Header row ──────────────────────────────────────────────────────
        header = new HBox(logoArea, toggleBtn);
        header.setAlignment(Pos.CENTER_LEFT);
        header.getStyleClass().add("sidebar-header");

        // ── Nav list ────────────────────────────────────────────────────────
        navList.getStyleClass().add("sidebar-nav-list");
        VBox.setVgrow(navList, Priority.ALWAYS);

        getChildren().addAll(header, navList);
    }

    // ── Public API ──────────────────────────────────────────────────────────

    public NavItem addNavItem(Ikon icon, String label) {
        NavItem item = new NavItem(icon, label, false);
        allItems.add(item);
        navList.getChildren().add(item);
        return item;
    }

    public NavItem addLogoutItem(Ikon icon, String label) {
        NavItem item = new NavItem(icon, label, true);
        allItems.add(item);
        navList.getChildren().add(item);
        return item;
    }

    public void addSeparator() {
        Region sep = new Region();
        sep.getStyleClass().add("sidebar-sep");
        sep.setMaxWidth(Double.MAX_VALUE);
        VBox.setMargin(sep, new Insets(4, 10, 4, 10));
        navList.getChildren().add(sep);
    }

    public void addSpacer() {
        Region spacer = new Region();
        VBox.setVgrow(spacer, Priority.ALWAYS);
        navList.getChildren().add(spacer);
    }

    public void setActive(NavItem item) {
        allItems.forEach(n -> n.setActive(false));
        if (item != null) item.setActive(true);
    }

    // ── Collapse / expand ───────────────────────────────────────────────────

    private void toggleCollapse() {
        isCollapsed = !isCollapsed;
        double target = isCollapsed ? COLLAPSED : EXPANDED;

        if (isCollapsed) {
            logoArea.setVisible(false);
            logoArea.setManaged(false);
            header.setAlignment(Pos.CENTER);
            allItems.forEach(n -> {
                n.setLabelVisible(false);
                n.setAlignment(Pos.CENTER);
            });
            toggleIcon.setIconCode(FontAwesomeSolid.ANGLE_RIGHT);
        } else {
            toggleIcon.setIconCode(FontAwesomeSolid.ANGLE_LEFT);
        }

        Timeline tl = new Timeline(new KeyFrame(ANIM,
            new KeyValue(prefWidthProperty(), target),
            new KeyValue(minWidthProperty(), target),
            new KeyValue(maxWidthProperty(), target)
        ));

        if (!isCollapsed) {
            tl.setOnFinished(e -> {
                logoArea.setVisible(true);
                logoArea.setManaged(true);
                header.setAlignment(Pos.CENTER_LEFT);
                allItems.forEach(n -> {
                    n.setLabelVisible(true);
                    n.setAlignment(Pos.CENTER_LEFT);
                });
            });
        }

        tl.play();
    }

    // ── NavItem ──────────────────────────────────────────────────────────────

    public static class NavItem extends HBox {

        private Runnable action;
        private final boolean logout;

        public NavItem(Ikon icon, String label, boolean logout) {
            this.logout = logout;

            getStyleClass().add(logout ? "sidebar-nav-logout" : "sidebar-nav-item");
            setAlignment(Pos.CENTER_LEFT);
            setSpacing(10);
            setPrefHeight(36);
            setMinHeight(36);
            setMaxHeight(36);
            setPadding(new Insets(0, 10, 0, 10));
            setCursor(Cursor.HAND);

            // Fixed-size icon wrapper — ensures every glyph occupies the same space
            FontIcon fi = new FontIcon(icon);
            fi.setIconSize(14);
            fi.getStyleClass().add(logout ? "nav-icon-logout" : "nav-icon");

            StackPane iconWrap = new StackPane(fi);
            iconWrap.setPrefSize(20, 20);
            iconWrap.setMinSize(20, 20);
            iconWrap.setMaxSize(20, 20);

            Label lbl = new Label(label);
            lbl.getStyleClass().add(logout ? "nav-label-logout" : "nav-label");

            getChildren().addAll(iconWrap, lbl);
            setOnMouseClicked(e -> { if (action != null) action.run(); });
            Tooltip.install(this, new Tooltip(label));
        }

        public void setAction(Runnable r) {
            this.action = r;
        }

        public void setActive(boolean active) {
            if (!logout) {
                getStyleClass().removeAll("sidebar-nav-item-active");
                if (active) getStyleClass().add("sidebar-nav-item-active");
            }
        }

        void setLabelVisible(boolean visible) {
            // children[0] = iconWrap, children[1] = label
            getChildren().get(1).setVisible(visible);
            getChildren().get(1).setManaged(visible);
        }
    }
}
