package fr.quartierconnect.desktopapp.plugin;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;

class PluginRegistryTest {

    private PluginRegistry registry;

    @BeforeEach
    void setUp() {
        registry = PluginRegistry.getInstance();
        registry.unregisterAll();
    }

    @Test
    void register_callsOnLoad() {
        AtomicBoolean loaded = new AtomicBoolean(false);

        registry.register(new QuartierConnectPlugin() {
            public String getId() { return "test.plugin"; }
            public String getName() { return "Test Plugin"; }
            public String getVersion() { return "1.0.0"; }
            public void onLoad() { loaded.set(true); }
            public void onUnload() {}
        });

        assertTrue(loaded.get(), "onLoad should be called on registration");
    }

    @Test
    void unregisterAll_callsOnUnload() {
        AtomicBoolean unloaded = new AtomicBoolean(false);

        registry.register(new QuartierConnectPlugin() {
            public String getId() { return "test.plugin2"; }
            public String getName() { return "Test Plugin 2"; }
            public String getVersion() { return "1.0.0"; }
            public void onLoad() {}
            public void onUnload() { unloaded.set(true); }
        });

        registry.unregisterAll();

        assertTrue(unloaded.get(), "onUnload should be called");
        assertEquals(0, registry.getPlugins().size());
    }

    @Test
    void getPlugins_returnsUnmodifiableList() {
        assertThrows(UnsupportedOperationException.class,
                () -> registry.getPlugins().add(null));
    }

    @Test
    void register_failingOnLoad_doesNotPreventFurtherRegistrations() {
        registry.register(new QuartierConnectPlugin() {
            public String getId() { return "failing.plugin"; }
            public String getName() { return "Failing"; }
            public String getVersion() { return "0.0.1"; }
            public void onLoad() { throw new RuntimeException("init error"); }
            public void onUnload() {}
        });

        AtomicBoolean secondLoaded = new AtomicBoolean(false);
        registry.register(new QuartierConnectPlugin() {
            public String getId() { return "good.plugin"; }
            public String getName() { return "Good"; }
            public String getVersion() { return "1.0.0"; }
            public void onLoad() { secondLoaded.set(true); }
            public void onUnload() {}
        });

        assertTrue(secondLoaded.get(), "Second plugin should load despite first failing");
        assertEquals(2, registry.getPlugins().size());
    }
}
