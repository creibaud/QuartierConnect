# Guide de développement de plugins — QuartierConnect Desktop

---

## Qu'est-ce qu'un plugin QuartierConnect ?

Un plugin est un fichier JAR qui étend l'application desktop QuartierConnect sans en modifier le code source. Les plugins sont chargés au démarrage par `PluginRegistry` et peuvent apporter des comportements tels que des tâches d'arrière-plan, des vues supplémentaires ou des intégrations avec des services externes.

Les plugins communiquent avec l'application en cours d'exécution exclusivement via l'interface `AppContext`. Ils n'ont aucun accès direct aux bases de données ni aux services internes.

---

## Interface de plugin

Tout plugin doit implémenter `fr.quartierconnect.desktopapp.plugin.QuartierConnectPlugin` :

```java
public interface QuartierConnectPlugin {

    /** Unique reverse-domain identifier, e.g. "fr.example.weather". */
    String getId();

    /** Human-readable name shown in the plugin manager UI. */
    String getName();

    /** Semver version string, e.g. "1.0.0". */
    String getVersion();

    /** Called once after registration. Initialise resources here. */
    void onLoad();

    /** Called once on shutdown or unload. Release resources here. */
    void onUnload();

    /** Short description of what the plugin does (shown in the plugin manager). */
    default String getDescription() { return ""; }
}
```

Source : `desktop-app/src/main/java/fr/quartierconnect/desktopapp/plugin/QuartierConnectPlugin.java`

---

## AppContext — Ce à quoi les plugins peuvent accéder

Les plugins reçoivent un `AppContext` au moment du chargement (injecté par le registre) qui expose :

| Getter | Service | Description |
|--------|---------|-------------|
| `getApiService()` | `ApiService` | Client HTTP authentifié — méthode `execute()` unique. Gère le rafraîchissement du JWT automatiquement. |
| `getAuthService()` | `AuthService` | Lit l'e-mail de l'utilisateur courant et l'état du token. Ne stockez pas les tokens — utilisez uniquement les méthodes en lecture seule. |
| `getScene()` | `Scene` | La scène JavaFX principale — pour l'injection de CSS (thèmes) ou l'extension de l'interface. |
| `getIncidentRepository()` | `IncidentRepository` | Accès en lecture/écriture au magasin d'incidents SQLite local. |
| `getSyncService()` | `SyncService` | Déclenche ou observe les opérations de synchronisation. |
| `getToastManager()` | `ToastManager` | Affiche des notifications toast dans l'interface. |
| `getEventBus()` | `PluginEventBus` | S'abonne aux événements de l'application (voir la section EventBus ci-dessous). |

Pour recevoir l'AppContext, implémentez `PluginRegistry.ContextAwarePlugin` en plus de `QuartierConnectPlugin` :

```java
public class WeatherPlugin implements QuartierConnectPlugin, PluginRegistry.ContextAwarePlugin {
    private AppContext context;

    @Override
    public void setContext(AppContext context) {
        this.context = context;
    }
    // ... rest of interface methods
}
```

Les plugins **ne doivent pas** accéder directement à `SQLiteDatabase`. Toutes les interactions avec l'interface doivent passer par les points d'extension fournis ou par la `Scene` provenant de l'AppContext.

---

## EventBus — Communication entre plugins

Le `PluginEventBus` fournit un mécanisme de publication/abonnement thread-safe (`CopyOnWriteArrayList`) permettant aux plugins de réagir aux événements de l'application sans polling.

### Événements disponibles

| Événement | Émis par | Charge utile | Description |
|-------|-----------|---------|-------------|
| `INCIDENTS_CHANGED` | SyncService, IncidentsView | null | Les données d'incidents locales ont changé |
| `SYNC_STARTED` | SyncService | null | Un cycle de synchronisation a commencé |
| `SYNC_COMPLETED` | SyncService | null | Le cycle de synchronisation s'est terminé avec succès |
| `SYNC_FAILED` | SyncService | String (message d'erreur) | Le cycle de synchronisation a échoué |
| `ONLINE_STATUS_CHANGED` | SyncService | Boolean | La connectivité réseau a changé |

### S'abonner aux événements

```java
@Override
public void onLoad() {
    context.getEventBus().subscribe(eventData -> {
        switch (eventData.event()) {
            case INCIDENTS_CHANGED ->
                context.getToastManager().show("Incidents updated");
            case ONLINE_STATUS_CHANGED -> {
                boolean online = (Boolean) eventData.payload();
                updateStatusIndicator(online);
            }
            default -> {}
        }
    });
}
```

### Publier des événements

Les plugins peuvent également publier des événements pour notifier d'autres plugins :

```java
context.getEventBus().publish(PluginEventBus.Event.INCIDENTS_CHANGED);
context.getEventBus().publish(PluginEventBus.Event.SYNC_FAILED, "Connection timeout");
```

Les exceptions levées par les abonnés sont interceptées et silencieusement ignorées — un écouteur défectueux ne peut pas casser les autres écouteurs ni le publieur.

---

## Créer un plugin étape par étape

### 1. Créer un module Maven

```xml
<!-- pom.xml -->
<project>
  <groupId>fr.example</groupId>
  <artifactId>qc-weather-plugin</artifactId>
  <version>1.0.0</version>
  <packaging>jar</packaging>

  <dependencies>
    <dependency>
      <groupId>fr.quartierconnect</groupId>
      <artifactId>quartierconnect-desktop-api</artifactId>
      <version>LATEST</version>
      <scope>provided</scope>
    </dependency>
  </dependencies>
</project>
```

### 2. Implémenter l'interface

```java
package fr.example.weather;

import fr.quartierconnect.desktopapp.plugin.QuartierConnectPlugin;
import java.util.logging.Logger;

public class WeatherPlugin implements QuartierConnectPlugin {

    private static final Logger LOG = Logger.getLogger(WeatherPlugin.class.getName());

    @Override
    public String getId() { return "fr.example.weather"; }

    @Override
    public String getName() { return "Weather Widget"; }

    @Override
    public String getVersion() { return "1.0.0"; }

    @Override
    public void onLoad() {
        LOG.info("WeatherPlugin loaded — starting weather fetch.");
    }

    @Override
    public void onUnload() {
        LOG.info("WeatherPlugin unloaded.");
    }
}
```

### 3. Déclarer l'implémentation via ServiceLoader

Créez `src/main/resources/META-INF/services/fr.quartierconnect.desktopapp.plugin.QuartierConnectPlugin` avec le nom pleinement qualifié de la classe :

```
fr.example.weather.WeatherPlugin
```

C'est ainsi que `PluginRegistry.loadFromJar()` découvre votre plugin à l'exécution.

### 4. Empaqueter en fat JAR

```bash
./mvnw clean package -q
# Produces: target/qc-weather-plugin-1.0.0.jar
```

---

## Installer un plugin

### Installation via JAR externe

Copiez le JAR dans le répertoire des plugins et appelez `loadFromDirectory()` au démarrage de l'application :

```bash
mkdir -p ~/.quartierconnect/plugins/
cp target/qc-weather-plugin-1.0.0.jar ~/.quartierconnect/plugins/
```

Puis, dans votre code de démarrage :

```java
AppContext ctx = new AppContext(apiService, authService, scene,
    incidentRepository, syncService, toastManager, eventBus);
PluginRegistry.getInstance().loadFromDirectory(
    Path.of(System.getProperty("user.home"), ".quartierconnect", "plugins"),
    ctx
);
```

### Enregistrement programmatique (développement)

```java
AppContext ctx = new AppContext(apiService, authService, scene,
    incidentRepository, syncService, toastManager, eventBus);
PluginRegistry.getInstance().register(new WeatherPlugin(), ctx);
```

Appelez ceci avant `Application.launch()` dans `Launcher.java` durant le développement. Utilisez la surcharge sans contexte `register(plugin)` si votre plugin n'implémente pas `ContextAwarePlugin`.

---

## Exemple minimal — HelloWorldPlugin

```java
package fr.example.hello;

import fr.quartierconnect.desktopapp.plugin.AppContext;
import fr.quartierconnect.desktopapp.plugin.PluginEventBus;
import fr.quartierconnect.desktopapp.plugin.PluginRegistry;
import fr.quartierconnect.desktopapp.plugin.QuartierConnectPlugin;

import java.util.function.Consumer;
import java.util.logging.Logger;

public class HelloWorldPlugin implements QuartierConnectPlugin, PluginRegistry.ContextAwarePlugin {

    private static final Logger LOG = Logger.getLogger(HelloWorldPlugin.class.getName());
    private AppContext context;
    private Consumer<PluginEventBus.EventData> listener;

    @Override public String getId()          { return "fr.example.hello"; }
    @Override public String getName()        { return "Hello World"; }
    @Override public String getVersion()     { return "0.1.0"; }
    @Override public String getDescription() { return "Shows a toast on every sync completion"; }

    @Override
    public void setContext(AppContext context) {
        this.context = context;
    }

    @Override
    public void onLoad() {
        listener = eventData -> {
            if (eventData.event() == PluginEventBus.Event.SYNC_COMPLETED) {
                context.getToastManager().show("Sync done!");
            }
        };
        context.getEventBus().subscribe(listener);
        LOG.info("HelloWorldPlugin loaded — listening for sync events.");
    }

    @Override
    public void onUnload() {
        context.getEventBus().unsubscribe(listener);
        LOG.info("HelloWorldPlugin unloaded.");
    }
}
```

---

## Contraintes

| Règle | Détail |
|------|--------|
| Accès API uniquement | Utilisez `ApiService` depuis `AppContext`. Aucun appel direct JDBC/MongoDB/Neo4j. |
| Aucun accès au stage de l'interface | N'obtenez ni ne modifiez `Stage` ou `Scene` en dehors des points d'extension fournis. |
| `onUnload` propre | Annulez toutes les tâches planifiées et fermez toutes les connexions dans `onUnload`. Les ressources non nettoyées produiront des avertissements et peuvent provoquer des fuites de threads. |
| Aucun stockage d'identifiants | Les plugins ne doivent pas stocker de tokens ni de mots de passe sur le disque. |
| Sûreté vis-à-vis des exceptions | Les exceptions levées depuis `onLoad` sont interceptées par le registre et journalisées — le plugin reste enregistré mais peut être non fonctionnel. Les exceptions dans `onUnload` sont interceptées et journalisées — l'arrêt se poursuit. |
