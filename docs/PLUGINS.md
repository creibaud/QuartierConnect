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
}
```

Source: `desktop-app/src/main/java/fr/quartierconnect/desktopapp/plugin/QuartierConnectPlugin.java`

---

## AppContext — What Plugins Can Access

Plugins receive an `AppContext` at load time (injected by the registry) that exposes:

| Service | Description |
|---------|-------------|
| `ApiService` | Authenticated HTTP client — call any `GET`/`POST` against the QuartierConnect API. Handles JWT refresh automatically. |
| `AuthService` | Read the current user's email and token state. Do not store tokens — use read-only methods only. |

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

Plugins **must not** access `SQLiteDatabase` or any JavaFX stage directly. All UI interactions should go through provided extension points.

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
AppContext ctx = new AppContext(apiService, authService);
PluginRegistry.getInstance().loadFromDirectory(
    Path.of(System.getProperty("user.home"), ".quartierconnect", "plugins"),
    ctx
);
```

### Programmatic registration (development)

```java
AppContext ctx = new AppContext(apiService, authService);
PluginRegistry.getInstance().register(new WeatherPlugin(), ctx);
```

Call this before `Application.launch()` in `Launcher.java` during development. Use the no-context overload `register(plugin)` if your plugin does not implement `ContextAwarePlugin`.

---

## Minimal Example — HelloWorldPlugin

```java
package fr.example.hello;

import fr.quartierconnect.desktopapp.plugin.QuartierConnectPlugin;

public class HelloWorldPlugin implements QuartierConnectPlugin {

    @Override public String getId()      { return "fr.example.hello"; }
    @Override public String getName()    { return "Hello World"; }
    @Override public String getVersion() { return "0.1.0"; }

    @Override
    public void onLoad() {
        System.out.println("Hello from QuartierConnect plugin!");
    }

    @Override
    public void onUnload() {
        System.out.println("Goodbye from QuartierConnect plugin!");
    }
}
```

---

## Constraints

| Rule | Detail |
|------|--------|
| API access only | Use `ApiService` from `AppContext`. No direct JDBC/MongoDB/Neo4j calls. |
| No UI stage access | Do not obtain or modify `Stage` or `Scene` outside provided extension points. |
| Clean `onUnload` | Cancel all scheduled tasks and close all connections in `onUnload`. Uncleaned resources will produce warnings and may leak threads. |
| No credential storage | Plugins must not store tokens or passwords to disk. |
| Exception safety | Exceptions thrown from `onLoad` are caught by the registry and logged — the plugin is still registered but may be non-functional. Exceptions in `onUnload` are caught and logged — shutdown continues. |
