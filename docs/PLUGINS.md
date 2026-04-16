# Plugin Development Guide — QuartierConnect Desktop

---

## What is a QuartierConnect Plugin?

A plugin is a JAR file that extends the QuartierConnect desktop application without modifying its source code. Plugins are loaded at startup by `PluginRegistry` and can contribute behaviour such as background tasks, additional views, or integrations with external services.

Plugins communicate with the running application exclusively through the `AppContext` interface. They have no direct access to databases or internal services.

---

## Plugin Interface

Every plugin must implement `fr.quartierconnect.desktopapp.plugin.QuartierConnectPlugin`:

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

Source: `desktop-app/src/main/java/fr/quartierconnect/desktopapp/plugin/QuartierConnectPlugin.java`

---

## AppContext — What Plugins Can Access

Plugins receive an `AppContext` at load time (injected by the registry) that exposes:

| Getter                    | Service              | Description                                                                                      |
| ------------------------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| `getApiService()`         | `ApiService`         | Authenticated HTTP client — single `execute()` method. Handles JWT refresh automatically.        |
| `getAuthService()`        | `AuthService`        | Read the current user's email and token state. Do not store tokens — use read-only methods only. |
| `getScene()`              | `Scene`              | The primary JavaFX scene — for CSS injection (themes) or UI extension.                           |
| `getIncidentRepository()` | `IncidentRepository` | Read/write access to the local SQLite incident store.                                            |
| `getSyncService()`        | `SyncService`        | Trigger or observe sync operations.                                                              |
| `getToastManager()`       | `ToastManager`       | Show toast notifications in the UI.                                                              |
| `getEventBus()`           | `PluginEventBus`     | Subscribe to application events (see EventBus section below).                                    |

To receive AppContext, implement `PluginRegistry.ContextAwarePlugin` in addition to `QuartierConnectPlugin`:

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

Plugins **must not** access `SQLiteDatabase` directly. All UI interactions should go through provided extension points or the `Scene` from AppContext.

---

## EventBus — Inter-plugin Communication

The `PluginEventBus` provides a thread-safe publish/subscribe mechanism (`CopyOnWriteArrayList`) for plugins to react to application events without polling.

### Available Events

| Event                   | Emitted by                 | Payload                | Description                      |
| ----------------------- | -------------------------- | ---------------------- | -------------------------------- |
| `INCIDENTS_CHANGED`     | SyncService, IncidentsView | null                   | Local incident data has changed  |
| `SYNC_STARTED`          | SyncService                | null                   | A sync cycle has begun           |
| `SYNC_COMPLETED`        | SyncService                | null                   | Sync cycle finished successfully |
| `SYNC_FAILED`           | SyncService                | String (error message) | Sync cycle failed                |
| `ONLINE_STATUS_CHANGED` | SyncService                | Boolean                | Network connectivity changed     |

### Subscribing to Events

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

### Publishing Events

Plugins can also publish events to notify other plugins:

```java
context.getEventBus().publish(PluginEventBus.Event.INCIDENTS_CHANGED);
context.getEventBus().publish(PluginEventBus.Event.SYNC_FAILED, "Connection timeout");
```

Exceptions thrown by subscribers are caught and silently ignored — a faulty listener cannot break other listeners or the publisher.

---

## Creating a Plugin Step by Step

### 1. Create a Maven module

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

### 2. Implement the interface

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

### 3. Declare the implementation via ServiceLoader

Create `src/main/resources/META-INF/services/fr.quartierconnect.desktopapp.plugin.QuartierConnectPlugin` with the fully-qualified class name:

```
fr.example.weather.WeatherPlugin
```

This is how `PluginRegistry.loadFromJar()` discovers your plugin at runtime.

### 4. Package as a fat JAR

```bash
./mvnw clean package -q
# Produces: target/qc-weather-plugin-1.0.0.jar
```

---

## Installing a Plugin

### External JAR installation

Copy the JAR into the plugin directory and call `loadFromDirectory()` at app startup:

```bash
mkdir -p ~/.quartierconnect/plugins/
cp target/qc-weather-plugin-1.0.0.jar ~/.quartierconnect/plugins/
```

Then in your startup code:

```java
AppContext ctx = new AppContext(apiService, authService, scene,
    incidentRepository, syncService, toastManager, eventBus);
PluginRegistry.getInstance().loadFromDirectory(
    Path.of(System.getProperty("user.home"), ".quartierconnect", "plugins"),
    ctx
);
```

### Programmatic registration (development)

```java
AppContext ctx = new AppContext(apiService, authService, scene,
    incidentRepository, syncService, toastManager, eventBus);
PluginRegistry.getInstance().register(new WeatherPlugin(), ctx);
```

Call this before `Application.launch()` in `Launcher.java` during development. Use the no-context overload `register(plugin)` if your plugin does not implement `ContextAwarePlugin`.

---

## Minimal Example — HelloWorldPlugin

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

## Constraints

| Rule                  | Detail                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API access only       | Use `ApiService` from `AppContext`. No direct JDBC/MongoDB/Neo4j calls.                                                                                                                                |
| No UI stage access    | Do not obtain or modify `Stage` or `Scene` outside provided extension points.                                                                                                                          |
| Clean `onUnload`      | Cancel all scheduled tasks and close all connections in `onUnload`. Uncleaned resources will produce warnings and may leak threads.                                                                    |
| No credential storage | Plugins must not store tokens or passwords to disk.                                                                                                                                                    |
| Exception safety      | Exceptions thrown from `onLoad` are caught by the registry and logged — the plugin is still registered but may be non-functional. Exceptions in `onUnload` are caught and logged — shutdown continues. |
