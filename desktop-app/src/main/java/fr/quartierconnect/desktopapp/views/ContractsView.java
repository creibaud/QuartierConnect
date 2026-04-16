package fr.quartierconnect.desktopapp.views;

import fr.quartierconnect.desktopapp.services.ContractsService;
import fr.quartierconnect.desktopapp.ui.components.AppBadge;
import fr.quartierconnect.desktopapp.ui.components.AppButton;
import fr.quartierconnect.desktopapp.ui.components.AppCard;
import fr.quartierconnect.desktopapp.ui.components.AppModal;
import fr.quartierconnect.desktopapp.ui.components.EmptyState;
import fr.quartierconnect.desktopapp.ui.components.SkeletonLoader;
import fr.quartierconnect.desktopapp.ui.components.ToastManager;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.ScrollPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;

import java.util.List;

public class ContractsView {

    private final ContractsService service = new ContractsService();
    private final AppModal appModal;
    private final ToastManager toast;
    private final VBox listContainer = new VBox(10);
    private final VBox root;

    public ContractsView(AppModal appModal, ToastManager toast) {
        this.appModal = appModal;
        this.toast = toast;
        this.root = buildLayout();
        loadAsync();
    }

    public VBox getRoot() {
        return root;
    }

    private VBox buildLayout() {
        Label pageTitle = new Label("Contrats");
        pageTitle.getStyleClass().add("content-title");

        Label pageSubtitle = new Label("Gestion et signature des contrats du quartier");
        pageSubtitle.getStyleClass().add("content-subtitle");

        AppButton refreshBtn = new AppButton("↺ Actualiser", AppButton.Variant.SECONDARY);
        refreshBtn.setOnAction(e -> loadAsync());

        HBox header = new HBox(12, new VBox(4, pageTitle, pageSubtitle), refreshBtn);
        header.setAlignment(Pos.CENTER_LEFT);
        HBox.setHgrow(header.getChildren().get(0), Priority.ALWAYS);
        header.setPadding(new Insets(0, 0, 16, 0));

        ScrollPane scroll = new ScrollPane(listContainer);
        scroll.setFitToWidth(true);
        scroll.setStyle("-fx-background-color: transparent; -fx-background: transparent;");
        VBox.setVgrow(scroll, Priority.ALWAYS);

        VBox layout = new VBox(0, header, scroll);
        layout.setPadding(new Insets(30));
        layout.getStyleClass().add("content-area");
        return layout;
    }

    private void loadAsync() {
        listContainer.getChildren().clear();
        SkeletonLoader skeleton = SkeletonLoader.forList(3);
        listContainer.getChildren().add(skeleton);

        new Thread(() -> {
            List<ContractsService.ContractSummary> contracts = service.fetchContracts();
            Platform.runLater(() -> {
                skeleton.stop();
                renderContracts(contracts);
            });
        }, "contracts-load").start();
    }

    private void renderContracts(List<ContractsService.ContractSummary> contracts) {
        listContainer.getChildren().clear();
        if (contracts.isEmpty()) {
            listContainer.getChildren().add(
                    new EmptyState("Aucun contrat disponible.",
                            "Les contrats apparaîtront ici une fois créés.")
            );
            return;
        }
        for (ContractsService.ContractSummary contract : contracts) {
            listContainer.getChildren().add(buildContractCard(contract));
        }
    }

    private AppCard buildContractCard(ContractsService.ContractSummary contract) {
        Label titleLbl = new Label(contract.title());
        titleLbl.getStyleClass().add("incident-title");

        AppBadge statusBadge = AppBadge.fromContractStatus(contract.status());
        HBox titleRow = new HBox(8, titleLbl, statusBadge);
        titleRow.setAlignment(Pos.CENTER_LEFT);

        String sigText = contract.signatureCount() + " / " + contract.signatoryCount() + " signature(s)";
        Label sigLbl = new Label(sigText);
        sigLbl.getStyleClass().add("incident-desc");

        AppCard card = new AppCard();
        card.getStyleClass().setAll("contract-card");
        card.setSpacing(6);
        card.getChildren().addAll(titleRow, sigLbl);

        if (contract.canSign()) {
            AppButton signBtn = new AppButton("✍ Signer", AppButton.Variant.PRIMARY);
            signBtn.setOnAction(e -> openSignForm(contract));
            HBox signRow = new HBox(signBtn);
            signRow.setAlignment(Pos.CENTER_RIGHT);
            signRow.setPadding(new Insets(8, 0, 0, 0));
            card.getChildren().add(signRow);
        }

        return card;
    }

    private void openSignForm(ContractsService.ContractSummary contract) {
        Label titleLbl = new Label(contract.title());
        titleLbl.getStyleClass().add("incident-title");

        Label instruction = new Label("Entrez votre code TOTP pour confirmer la signature.");
        instruction.getStyleClass().add("content-subtitle");
        instruction.setWrapText(true);

        Label totpFormLabel = new Label("Code TOTP *");
        totpFormLabel.getStyleClass().add("form-label");

        PasswordField totpField = new PasswordField();
        totpField.setPromptText("6 chiffres");
        totpField.setMaxWidth(200);

        Label errorMsg = new Label("");
        errorMsg.getStyleClass().add("error-label");
        errorMsg.setVisible(false);
        errorMsg.setManaged(false);

        int[] attempts = {0};

        AppButton submitBtn = new AppButton("Confirmer", AppButton.Variant.PRIMARY);
        AppButton cancelBtn = new AppButton("Annuler", AppButton.Variant.SECONDARY);
        cancelBtn.setOnAction(e -> {
            totpField.clear();
            appModal.hide();
        });

        submitBtn.setOnAction(e -> {
            String code = totpField.getText().trim();
            if (code.isEmpty()) {
                showError(errorMsg, "Le code TOTP est obligatoire.");
                return;
            }
            if (code.length() != 6 || !code.matches("\\d+")) {
                showError(errorMsg, "Le code doit être composé de 6 chiffres.");
                return;
            }

            attempts[0]++;
            submitBtn.setDisable(true);
            submitBtn.setText("Signature…");
            String capturedCode = code;
            totpField.clear();

            new Thread(() -> {
                try {
                    service.signContract(contract.id(), capturedCode);
                    Platform.runLater(() -> {
                        appModal.hide();
                        toast.showSuccess("Contrat signé avec succès ✓");
                        loadAsync();
                    });
                } catch (Exception ex) {
                    Platform.runLater(() -> {
                        submitBtn.setDisable(false);
                        submitBtn.setText("Confirmer");
                        String msg = ex.getMessage() != null && ex.getMessage().contains("401")
                                ? "Code invalide. Réessayez."
                                : "Erreur réseau — réessayez.";
                        if (attempts[0] >= 3) {
                            msg = "Trop de tentatives. Fermez et réessayez.";
                            submitBtn.setDisable(true);
                        }
                        showError(errorMsg, msg);
                    });
                }
            }, "contract-sign").start();
        });

        HBox buttons = new HBox(8, submitBtn, cancelBtn);
        buttons.setAlignment(Pos.CENTER_RIGHT);

        VBox content = new VBox(12, titleLbl, instruction, totpFormLabel, totpField, errorMsg, buttons);
        content.setPadding(new Insets(20, 20, 20, 20));

        appModal.show("Signer le contrat", content);
    }

    private void showError(Label errorMsg, String message) {
        errorMsg.setText(message);
        errorMsg.setVisible(true);
        errorMsg.setManaged(true);
    }
}
