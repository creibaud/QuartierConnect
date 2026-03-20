module fr.quartierconnect.desktopapp {
  requires javafx.controls;
  requires javafx.fxml;
  requires javafx.web;
  requires org.controlsfx.controls;
  requires com.dlsc.formsfx;
  requires net.synedra.validatorfx;
  requires org.kordamp.ikonli.javafx;
  requires eu.hansolo.tilesfx;

  opens fr.quartierconnect.desktopapp to
      javafx.fxml;

  exports fr.quartierconnect.desktopapp;
}
