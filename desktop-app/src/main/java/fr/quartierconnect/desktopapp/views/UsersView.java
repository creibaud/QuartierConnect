package fr.quartierconnect.desktopapp.views;

import fr.quartierconnect.desktopapp.services.UsersService;
import fr.quartierconnect.desktopapp.ui.components.AppBadge;
import fr.quartierconnect.desktopapp.ui.components.AppButton;
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
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;

import java.util.List;

public class UsersView {

    private final UsersService usersService = new UsersService();
    private final ToastManager toast;
    private final VBox root;
    private final TableView<UsersService.UserSummary> table = new TableView<>();
    private final VBox skeletonHolder = new VBox();

    public UsersView(ToastManager toast) {
        this.toast = toast;
        this.root = buildLayout();
        loadAsync();
    }

    public VBox getRoot() {
        return root;
    }

    private VBox buildLayout() {
        Label pageTitle = new Label("Gestion des utilisateurs");
        pageTitle.getStyleClass().add("content-title");

        Label pageSubtitle = new Label("Administration des comptes et des rôles");
        pageSubtitle.getStyleClass().add("content-subtitle");

        AppButton refreshBtn = new AppButton("↺ Actualiser", AppButton.Variant.SECONDARY);
        refreshBtn.setOnAction(e -> loadAsync());

        HBox header = new HBox(12, new VBox(4, pageTitle, pageSubtitle), refreshBtn);
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
        TableColumn<UsersService.UserSummary, String> emailCol = new TableColumn<>("Email");
        emailCol.setCellValueFactory(c -> new SimpleStringProperty(c.getValue().email()));
        emailCol.setCellFactory(col -> new TableCell<>() {
            @Override
            protected void updateItem(String val, boolean empty) {
                super.updateItem(val, empty);
                if (empty || val == null) { setText(null); setStyle(""); }
                else { setText(val); setStyle("-fx-font-weight: bold; -fx-font-size: 13px;"); }
            }
        });

        TableColumn<UsersService.UserSummary, String> roleCol = new TableColumn<>("Rôle");
        roleCol.setPrefWidth(130);
        roleCol.setResizable(false);
        roleCol.setCellValueFactory(c -> new SimpleStringProperty(c.getValue().role()));
        roleCol.setCellFactory(col -> new TableCell<>() {
            @Override
            protected void updateItem(String role, boolean empty) {
                super.updateItem(role, empty);
                if (empty || role == null) {
                    setGraphic(null);
                } else {
                    setGraphic(AppBadge.fromRole(role));
                }
            }
        });

        TableColumn<UsersService.UserSummary, String> statusCol = new TableColumn<>("Statut");
        statusCol.setPrefWidth(110);
        statusCol.setResizable(false);
        statusCol.setCellValueFactory(c -> new SimpleStringProperty(c.getValue().banned() ? "banned" : "active"));
        statusCol.setCellFactory(col -> new TableCell<>() {
            @Override
            protected void updateItem(String status, boolean empty) {
                super.updateItem(status, empty);
                if (empty || status == null) {
                    setGraphic(null);
                } else if ("banned".equals(status)) {
                    setGraphic(new AppBadge("Banni", AppBadge.Variant.CONFLICT));
                } else {
                    setGraphic(new AppBadge("Actif", AppBadge.Variant.RESOLVED));
                }
            }
        });

        TableColumn<UsersService.UserSummary, Void> actionsCol = new TableColumn<>("Actions");
        actionsCol.setPrefWidth(250);
        actionsCol.setResizable(false);
        actionsCol.setCellFactory(col -> new TableCell<>() {
            @Override
            protected void updateItem(Void item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || getIndex() >= getTableView().getItems().size()) {
                    setGraphic(null);
                } else {
                    UsersService.UserSummary user = getTableView().getItems().get(getIndex());
                    setGraphic(buildActionRow(user));
                }
            }
        });

        table.getColumns().addAll(emailCol, roleCol, statusCol, actionsCol);
        table.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY);
        table.getStyleClass().add("admin-table");
        table.setPlaceholder(new Label("Aucun utilisateur"));
        table.setFixedCellSize(42);
    }

    private HBox buildActionRow(UsersService.UserSummary user) {
        HBox row = new HBox(4);
        row.setAlignment(Pos.CENTER_LEFT);
        row.setPadding(new Insets(0, 4, 0, 4));

        if (!"admin".equals(user.role())) {
            String nextRole = "user".equals(user.role()) ? "moderator" : "user";
            String btnLabel = "user".equals(user.role()) ? "→ Modérateur" : "→ Utilisateur";
            AppButton roleBtn = new AppButton(btnLabel, AppButton.Variant.GHOST);
            roleBtn.setOnAction(e -> changeRole(user, nextRole));
            row.getChildren().add(roleBtn);
        }

        if (!user.banned()) {
            AppButton banBtn = new AppButton("Bannir", AppButton.Variant.DESTRUCTIVE);
            banBtn.setOnAction(e -> toggleBan(user, true));
            row.getChildren().add(banBtn);
        } else {
            AppButton unbanBtn = new AppButton("Débannir", AppButton.Variant.SECONDARY);
            unbanBtn.setOnAction(e -> toggleBan(user, false));
            row.getChildren().add(unbanBtn);
        }

        return row;
    }

    private void toggleBan(UsersService.UserSummary user, boolean ban) {
        new Thread(() -> {
            try {
                usersService.banUser(user.id(), ban);
                Platform.runLater(() -> {
                    loadAsync();
                    toast.showSuccess(ban ? "Utilisateur banni ✓" : "Utilisateur débanni ✓");
                });
            } catch (Exception ex) {
                Platform.runLater(() -> toast.showError("Erreur — " + ex.getMessage()));
            }
        }, "user-ban").start();
    }

    private void changeRole(UsersService.UserSummary user, String role) {
        new Thread(() -> {
            try {
                usersService.changeRole(user.id(), role);
                Platform.runLater(() -> {
                    loadAsync();
                    toast.showSuccess("Rôle mis à jour ✓");
                });
            } catch (Exception ex) {
                Platform.runLater(() -> toast.showError("Erreur — " + ex.getMessage()));
            }
        }, "user-role").start();
    }

    private void loadAsync() {
        table.getItems().clear();
        SkeletonLoader skeleton = SkeletonLoader.forList(4);
        skeletonHolder.getChildren().setAll(skeleton);
        table.setVisible(false);

        new Thread(() -> {
            List<UsersService.UserSummary> users = usersService.fetchUsers();
            Platform.runLater(() -> {
                skeleton.stop();
                skeletonHolder.getChildren().clear();
                table.setVisible(true);
                if (users.isEmpty()) {
                    table.setPlaceholder(new EmptyState("Aucun utilisateur.", "Les utilisateurs inscrits apparaîtront ici."));
                } else {
                    table.getItems().setAll(users);
                }
            });
        }, "users-load").start();
    }
}
