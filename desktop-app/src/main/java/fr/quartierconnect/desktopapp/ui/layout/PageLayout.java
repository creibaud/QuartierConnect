package fr.quartierconnect.desktopapp.ui.layout;

import javafx.scene.Node;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;

public class PageLayout extends HBox {

    private final AppSidebar sidebar;
    private final AppTopBar  topBar;
    private final StackPane  contentArea = new StackPane();
    private final StatusBar  statusBar   = new StatusBar();

    public PageLayout(AppSidebar sidebar, AppTopBar topBar) {
        this.sidebar = sidebar;
        this.topBar  = topBar;

        contentArea.getStyleClass().add("content-area");
        VBox.setVgrow(contentArea, Priority.ALWAYS);

        VBox rightPane = new VBox(topBar, contentArea);
        VBox.setVgrow(contentArea, Priority.ALWAYS);
        HBox.setHgrow(rightPane, Priority.ALWAYS);

        getChildren().addAll(sidebar, rightPane);
        getStyleClass().add("app-shell");
    }

    public void setContent(Node node) {
        contentArea.getChildren().setAll(node);
    }

    public AppSidebar getSidebar()  { return sidebar; }
    public AppTopBar  getTopBar()   { return topBar; }
    public StatusBar  getStatusBar(){ return statusBar; }
}
