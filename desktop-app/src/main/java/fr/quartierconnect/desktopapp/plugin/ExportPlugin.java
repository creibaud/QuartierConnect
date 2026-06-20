package fr.quartierconnect.desktopapp.plugin;

import fr.quartierconnect.desktopapp.database.IncidentRepository;
import fr.quartierconnect.desktopapp.i18n.I18n;
import fr.quartierconnect.desktopapp.ui.components.AppButton;
import javafx.application.Platform;
import javafx.scene.Node;
import javafx.scene.control.Alert;
import javafx.scene.control.Label;
import javafx.scene.layout.VBox;
import org.kordamp.ikonli.fontawesome5.FontAwesomeSolid;
import org.kordamp.ikonli.javafx.FontIcon;

import java.io.BufferedWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Built-in plugin — exports local incidents to CSV.
 * When active, injects an Export button into the incidents table header via PluginRegistry.incidentSlot.
 */
public class ExportPlugin implements QuartierConnectPlugin, PluginRegistry.ContextAwarePlugin, ViewablePlugin {

    private AppContext context;
    private AppButton injectedBtn;

    @Override
    public void setContext(AppContext ctx) { this.context = ctx; }

    @Override public String getId()      { return "fr.quartierconnect.plugin.export"; }
    @Override public String getName()    { return I18n.get("plugin.export.name"); }
    @Override public String getVersion() { return "1.0.0"; }
    @Override public String getDescription() { return I18n.get("plugin.export.description"); }

    @Override
    public void onLoad() {
        FontIcon icon = new FontIcon(FontAwesomeSolid.FILE_CSV);
        icon.setIconSize(12);

        injectedBtn = new AppButton(I18n.get("plugin.export.button"), AppButton.Variant.SECONDARY);
        injectedBtn.setGraphic(icon);
        injectedBtn.setGraphicTextGap(6);
        injectedBtn.setOnAction(e -> runExport(injectedBtn));

        PluginRegistry.getInstance().getIncidentSlot().add(injectedBtn);
    }

    @Override
    public void onUnload() {
        if (injectedBtn != null) {
            PluginRegistry.getInstance().getIncidentSlot().remove(injectedBtn);
            injectedBtn = null;
        }
    }

    @Override
    public Node getPanel() {
        Label desc = new Label(I18n.get("plugin.export.panelDesc"));
        desc.setStyle("-fx-font-size: 11.5px; -fx-text-fill: -color-fg-muted;");
        desc.setWrapText(true);

        Label note = new Label(I18n.get("plugin.export.note"));
        note.setStyle("-fx-font-size: 10.5px; -fx-text-fill: -color-fg-subtle;");
        note.setWrapText(true);

        return new VBox(8, desc, note);
    }

    private void runExport(AppButton btn) {
        btn.setDisable(true);
        new Thread(() -> {
            try {
                IncidentRepository repo = context != null ? context.getIncidentRepository() : new IncidentRepository();
                List<IncidentRepository.Incident> incidents = repo.listAll();
                String timestamp = DateTimeFormatter.ofPattern("yyyyMMdd_HHmm").format(LocalDateTime.now());
                Path outputPath = Paths.get(System.getProperty("user.home"), "incidents_qc_" + timestamp + ".csv");

                try (BufferedWriter writer = Files.newBufferedWriter(outputPath, StandardCharsets.UTF_8)) {
                    writer.write("id,remote_id,title,description,status,is_dirty,is_conflict,updated_at\n");
                    for (IncidentRepository.Incident i : incidents) {
                        writer.write(csvRow(
                            String.valueOf(i.localId()),
                            i.remoteId() != null ? i.remoteId() : "",
                            i.title(), i.description(), i.status(),
                            i.isDirty() ? "1" : "0",
                            i.isConflict() ? "1" : "0",
                            i.updatedAt() != null ? i.updatedAt() : ""
                        ));
                    }
                }

                int count = incidents.size();
                String path = outputPath.toAbsolutePath().toString();
                Platform.runLater(() -> {
                    btn.setDisable(false);
                    Alert alert = new Alert(Alert.AlertType.INFORMATION);
                    alert.setTitle(I18n.get("plugin.export.successTitle"));
                    alert.setHeaderText(count > 1
                            ? I18n.get("plugin.export.successHeaderMany", count)
                            : I18n.get("plugin.export.successHeaderOne", count));
                    alert.setContentText(I18n.get("plugin.export.successContent", path));
                    alert.show();
                });
            } catch (Exception ex) {
                String msg = ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName();
                Platform.runLater(() -> {
                    btn.setDisable(false);
                    Alert alert = new Alert(Alert.AlertType.ERROR);
                    alert.setTitle(I18n.get("plugin.export.errorTitle"));
                    alert.setHeaderText(I18n.get("plugin.export.errorHeader"));
                    alert.setContentText(msg);
                    alert.show();
                });
            }
        }, "export-csv").start();
    }

    private String csvRow(String... values) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < values.length; i++) {
            if (i > 0) sb.append(',');
            String val = values[i] != null ? values[i] : "";
            val = val.replace("\"", "\"\"");
            if (val.contains(",") || val.contains("\"") || val.contains("\n")) {
                sb.append('"').append(val).append('"');
            } else {
                sb.append(val);
            }
        }
        sb.append('\n');
        return sb.toString();
    }
}
