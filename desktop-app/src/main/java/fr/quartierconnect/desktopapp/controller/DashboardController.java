package fr.quartierconnect.desktopapp.controller;

import fr.quartierconnect.desktopapp.model.AuthSession;
import fr.quartierconnect.desktopapp.service.ApiService;
import fr.quartierconnect.desktopapp.ui.BrandLogo;
import fr.quartierconnect.desktopapp.view.ViewManager;
import javafx.fxml.FXML;
import javafx.scene.control.Label;
import javafx.scene.layout.HBox;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;

public class DashboardController {

  @FXML private Label userEmailLabel;
  @FXML private Label userRoleLabel;
  @FXML private StackPane contentArea;
  @FXML private VBox navOverview;
  @FXML private VBox navIncidents;
  @FXML private VBox navEvents;
  @FXML private VBox navUsers;
  @FXML private VBox overviewSection;
  @FXML private Label incidentsSection;
  @FXML private Label eventsSection;
  @FXML private Label usersSection;
  @FXML private HBox brandLogoContainer;

  private AuthSession session;

  @FXML
  public void initialize() {
    // Injecter le logo SVG dans le conteneur
    if (brandLogoContainer != null && !brandLogoContainer.getChildren().isEmpty()) {
      BrandLogo logo = new BrandLogo(24);
      brandLogoContainer.getChildren().set(0, logo);
    }
  }

  public void initSession(AuthSession session) {
    this.session = session;
    userEmailLabel.setText(session.getUser().getEmail());
    userRoleLabel.setText(session.getUser().getRole().toUpperCase());
    showOverview();
  }

  @FXML
  public void onOverviewClick() {
    clearNavSelection();
    navOverview.getStyleClass().add("nav-item-active");
    showOverview();
  }

  @FXML
  public void onIncidentsClick() {
    clearNavSelection();
    navIncidents.getStyleClass().add("nav-item-active");
    showSection(incidentsSection);
  }

  @FXML
  public void onEventsClick() {
    clearNavSelection();
    navEvents.getStyleClass().add("nav-item-active");
    showSection(eventsSection);
  }

  @FXML
  public void onUsersClick() {
    clearNavSelection();
    navUsers.getStyleClass().add("nav-item-active");
    showSection(usersSection);
  }

  @FXML
  public void onLogout() {
    ApiService.getInstance().clearSession();
    ViewManager.getInstance().showLogin();
  }

  private void showOverview() {
    contentArea.getChildren().setAll(overviewSection);
  }

  private void showSection(Label section) {
    contentArea.getChildren().setAll(section);
  }

  private void clearNavSelection() {
    navOverview.getStyleClass().remove("nav-item-active");
    navIncidents.getStyleClass().remove("nav-item-active");
    navEvents.getStyleClass().remove("nav-item-active");
    navUsers.getStyleClass().remove("nav-item-active");
  }
}
