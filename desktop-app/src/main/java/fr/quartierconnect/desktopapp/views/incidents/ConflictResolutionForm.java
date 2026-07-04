package fr.quartierconnect.desktopapp.views.incidents;

import fr.quartierconnect.desktopapp.database.IncidentRepository;
import fr.quartierconnect.desktopapp.i18n.I18n;
import fr.quartierconnect.desktopapp.ui.components.AppBadge;
import fr.quartierconnect.desktopapp.ui.components.AppButton;
import fr.quartierconnect.desktopapp.ui.components.AppModal;
import fr.quartierconnect.desktopapp.ui.components.ToastManager;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.geometry.VPos;
import javafx.scene.control.Label;
import javafx.scene.layout.ColumnConstraints;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.layout.RowConstraints;
import javafx.scene.layout.VBox;
import org.kordamp.ikonli.fontawesome5.FontAwesomeSolid;
import org.kordamp.ikonli.javafx.FontIcon;

import java.sql.SQLException;
import java.util.Objects;

public class ConflictResolutionForm {

    private final AppModal           appModal;
    private final ToastManager       toast;
    private final IncidentRepository repo;
    private final Runnable           onResolved;

    public ConflictResolutionForm(AppModal appModal, ToastManager toast, IncidentRepository repo, Runnable onResolved) {
        this.appModal   = appModal;
        this.toast      = toast;
        this.repo       = repo;
        this.onResolved = onResolved;
    }

    public void open(IncidentRepository.Incident item) {
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

    private void resolveConflict(int localId, boolean acceptRemote) {
        try {
            repo.resolveConflict(localId, acceptRemote);
            onResolved.run();
            toast.showSuccess(acceptRemote ? I18n.get("incidents.conflict.acceptedRemote") : I18n.get("incidents.conflict.keptLocal"));
        } catch (SQLException e) {
            toast.showError(I18n.get("incidents.conflict.resolveError"));
        }
    }

    private GridPane buildMergeGrid(IncidentRepository.Incident item) {
        GridPane grid = new GridPane();
        grid.getStyleClass().add("merge-grid");
        grid.setHgap(0);
        grid.setVgap(0);

        // Colonne « champ » assez large pour « Description » sans retour à la ligne.
        ColumnConstraints fieldCol = new ColumnConstraints();
        fieldCol.setMinWidth(112);
        fieldCol.setPrefWidth(112);
        fieldCol.setMaxWidth(112);

        // Base / local / serveur : tiers égaux de la largeur restante.
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

        // Rangées : cellules étirées sur toute la hauteur de la ligne et centrées
        // verticalement, pour que bordures/fonds soient continus et que badge et
        // texte restent alignés d'une colonne à l'autre.
        for (int r = 0; r < 4; r++) {
            RowConstraints rc = new RowConstraints();
            rc.setValignment(VPos.CENTER);
            rc.setFillHeight(true);
            grid.getRowConstraints().add(rc);
        }

        addMergeHeader(grid, 0);

        String baseStatus = item.baseStatus();
        String baseTitle  = item.baseTitle();
        String baseDesc   = item.baseDescription();

        boolean statusDiff = !Objects.equals(item.status(), item.remoteStatus());
        boolean titleDiff  = !Objects.equals(item.title(), item.remoteTitle());
        boolean descDiff   = !Objects.equals(item.description(), item.remoteDescription());

        addMergeRowStatus(grid, 1, I18n.get("incidents.merge.status"), baseStatus, item.status(), item.remoteStatus(), statusDiff);
        addMergeRowText(grid, 2, I18n.get("incidents.merge.title"), baseTitle, item.title(), item.remoteTitle(), titleDiff);
        addMergeRowText(grid, 3, I18n.get("incidents.merge.description"), baseDesc, item.description(), item.remoteDescription(), descDiff);

        return grid;
    }

    private void addMergeHeader(GridPane grid, int row) {
        Label fieldH = new Label("");
        fieldH.getStyleClass().add("merge-grid-header");
        stretchCell(fieldH);

        FontIcon baseIcon = new FontIcon(FontAwesomeSolid.CODE_BRANCH);
        baseIcon.setIconSize(10);
        baseIcon.getStyleClass().add("merge-header-icon-base");
        Label baseH = new Label(I18n.get("incidents.merge.base"));
        baseH.setGraphic(baseIcon);
        baseH.getStyleClass().add("merge-grid-header");
        baseH.getStyleClass().add("merge-grid-header-base");
        stretchCell(baseH);

        FontIcon localIcon = new FontIcon(FontAwesomeSolid.LAPTOP);
        localIcon.setIconSize(10);
        localIcon.getStyleClass().add("merge-header-icon-local");
        Label localH = new Label(I18n.get("incidents.merge.local"));
        localH.setGraphic(localIcon);
        localH.getStyleClass().add("merge-grid-header");
        localH.getStyleClass().add("merge-grid-header-local");
        stretchCell(localH);

        FontIcon remoteIcon = new FontIcon(FontAwesomeSolid.CLOUD);
        remoteIcon.setIconSize(10);
        remoteIcon.getStyleClass().add("merge-header-icon-remote");
        Label remoteH = new Label(I18n.get("incidents.merge.server"));
        remoteH.setGraphic(remoteIcon);
        remoteH.getStyleClass().add("merge-grid-header");
        remoteH.getStyleClass().add("merge-grid-header-remote");
        stretchCell(remoteH);

        grid.add(fieldH,   0, row);
        grid.add(baseH,    1, row);
        grid.add(localH,   2, row);
        grid.add(remoteH,  3, row);
    }

    private void addMergeRowText(GridPane grid, int row, String fieldName,
                                  String baseVal, String localVal, String remoteVal, boolean isDiff) {
        Label fieldLbl = new Label(fieldName);
        fieldLbl.getStyleClass().add("merge-grid-field");
        stretchCell(fieldLbl);

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
        stretchCell(fieldLbl);

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
        stretchCell(lbl);
        lbl.getStyleClass().addAll(styleClasses);
        return lbl;
    }

    private HBox statusCell(String status, String styleClass) {
        AppBadge badge = AppBadge.fromStatus(status != null ? status : "open");
        HBox box = new HBox(badge);
        box.setAlignment(Pos.CENTER_LEFT);
        box.getStyleClass().addAll("merge-grid-cell", styleClass);
        stretchCell(box);
        return box;
    }

    /** Étire une cellule sur toute la largeur et la hauteur de sa case ; le texte
     *  d'un Label est aligné à gauche et centré verticalement, de sorte que les
     *  colonnes base / local / serveur restent alignées ligne à ligne. */
    private void stretchCell(Region cell) {
        cell.setMaxWidth(Double.MAX_VALUE);
        cell.setMaxHeight(Double.MAX_VALUE);
        if (cell instanceof Label) {
            ((Label) cell).setAlignment(Pos.CENTER_LEFT);
        }
    }
}
