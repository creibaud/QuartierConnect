module fr.quartierconnect.desktopapp {
  requires javafx.controls;
  requires javafx.fxml;
  requires javafx.web;
  requires org.controlsfx.controls;
  requires com.dlsc.formsfx;
  requires net.synedra.validatorfx;
  requires org.kordamp.ikonli.javafx;
  requires eu.hansolo.tilesfx;
  requires com.fasterxml.jackson.databind;
  requires java.net.http;
  requires jdk.httpserver;
  requires java.desktop;

  opens fr.quartierconnect.desktopapp to
      javafx.fxml;
  opens fr.quartierconnect.desktopapp.controller to
      javafx.fxml;
  opens fr.quartierconnect.desktopapp.model to
      com.fasterxml.jackson.databind;

  exports fr.quartierconnect.desktopapp;
  exports fr.quartierconnect.desktopapp.controller;
  exports fr.quartierconnect.desktopapp.model;
  exports fr.quartierconnect.desktopapp.service;
  exports fr.quartierconnect.desktopapp.view;
}
