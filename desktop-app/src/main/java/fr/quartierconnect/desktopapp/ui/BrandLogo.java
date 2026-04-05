package fr.quartierconnect.desktopapp.ui;

import javafx.scene.layout.Pane;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;

/**
 * BrandLogo - Icône simple native JavaFX (cercle coloré).
 * Plus simple et plus fiable que les SVGPath.
 */
public class BrandLogo extends Pane {

  private static final Color DEFAULT_COLOR = Color.web("#4f46e5");

  public BrandLogo(double size) {
    this(size, DEFAULT_COLOR);
  }

  public BrandLogo(double size, Color color) {
    setPrefSize(size, size);
    setMinSize(size, size);
    setMaxSize(size, size);

    // Cercle simple avec la couleur primary
    Circle circle = new Circle(size / 2, color);
    circle.setRadius(size / 2);
    getChildren().add(circle);
  }
}
