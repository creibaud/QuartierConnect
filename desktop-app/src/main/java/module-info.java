module fr.quartierconnect.desktopapp {
    requires javafx.controls;
    requires javafx.fxml;
    requires java.net.http;
    requires jdk.httpserver;
    requires java.sql;
    requires java.prefs;
    requires com.fasterxml.jackson.databind;

    opens fr.quartierconnect.desktopapp to javafx.fxml;
    opens fr.quartierconnect.desktopapp.views to javafx.fxml;
    exports fr.quartierconnect.desktopapp;
    exports fr.quartierconnect.desktopapp.views;
    exports fr.quartierconnect.desktopapp.services;
    exports fr.quartierconnect.desktopapp.database;
    exports fr.quartierconnect.desktopapp.plugin;
    uses fr.quartierconnect.desktopapp.plugin.QuartierConnectPlugin;
}
