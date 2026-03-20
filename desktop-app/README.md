# Desktop App - QuartierConnect

Application desktop du projet QuartierConnect, construite avec [JavaFX](https://openjfx.io/) 21 et Java 21.

## Stack technique

- **Langage** : Java 21
- **UI Framework** : JavaFX 21
- **Build** : Apache Maven
- **Tests** : JUnit 5

### Bibliothèques JavaFX

| Bibliothèque   | Description                             |
|----------------|-----------------------------------------|
| ControlsFX     | Composants UI avancés                   |
| FormsFX        | Construction de formulaires             |
| ValidatorFX    | Validation de formulaires               |
| Ikonli         | Icônes vectorielles                     |
| TilesFX        | Tuiles de tableau de bord               |

## Structure

```text
desktop-app/
├── src/
│   └── main/
│       ├── java/
│       │   ├── module-info.java
│       │   └── fr/quartierconnect/desktopapp/
│       │       ├── HelloApplication.java   # Point d'entrée JavaFX
│       │       ├── HelloController.java    # Contrôleur FXML
│       │       └── Launcher.java          # Launcher (contournement module)
│       └── resources/
│           └── fr/quartierconnect/desktopapp/
│               └── (fichiers FXML et ressources)
└── pom.xml
```

## Prérequis

- Java 21 (JDK)
- Maven (ou utiliser le wrapper `mvnw` fourni)

## Démarrage

```bash
./mvnw clean javafx:run
```

Ou depuis la racine du projet :

```bash
make dev-desktop
```

## Commandes Maven

| Commande                    | Description                    |
|-----------------------------|--------------------------------|
| `./mvnw clean javafx:run`   | Compiler et lancer l'app       |
| `./mvnw clean package`      | Créer le JAR                   |
| `./mvnw test`               | Lancer les tests JUnit         |
| `./mvnw clean install`      | Build complet avec tests       |
