module fr.quartierconnect.desktopapp {
    requires javafx.controls;
    requires javafx.fxml;
    requires java.net.http;
    requires jdk.httpserver;
    requires java.sql;
    requires java.prefs;
    requires com.fasterxml.jackson.databind;
    requires java.keyring;
    requires atlantafx.base;
    requires org.kordamp.ikonli.core;
    requires org.kordamp.ikonli.javafx;
    requires org.kordamp.ikonli.fontawesome5;

    opens fr.quartierconnect.desktopapp to javafx.fxml;
    opens fr.quartierconnect.desktopapp.views to javafx.fxml;
    opens fr.quartierconnect.desktopapp.ui.components to javafx.fxml;
    opens fr.quartierconnect.desktopapp.ui.layout to javafx.fxml;
    exports fr.quartierconnect.desktopapp;
    exports fr.quartierconnect.desktopapp.views;
    exports fr.quartierconnect.desktopapp.services;
    exports fr.quartierconnect.desktopapp.database;
    exports fr.quartierconnect.desktopapp.plugin;
    exports fr.quartierconnect.desktopapp.ui.components;
    exports fr.quartierconnect.desktopapp.ui.layout;
    exports fr.quartierconnect.desktopapp.util;
    uses fr.quartierconnect.desktopapp.plugin.QuartierConnectPlugin;
}
