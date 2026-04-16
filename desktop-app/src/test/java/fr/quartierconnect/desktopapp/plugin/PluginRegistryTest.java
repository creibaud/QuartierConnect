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
    void isEnabled_defaultTrue_forNewlyRegisteredPlugin() {
        registry.register(new QuartierConnectPlugin() {
            public String getId() { return "enabled.default"; }
            public String getName() { return "Enabled Default"; }
            public String getVersion() { return "1.0.0"; }
            public void onLoad() {}
            public void onUnload() {}
        });

        assertTrue(registry.isEnabled("enabled.default"));
    }

    @Test
    void disable_callsOnUnloadAndMarksDisabled() {
        AtomicBoolean unloaded = new AtomicBoolean(false);

        registry.register(new QuartierConnectPlugin() {
            public String getId() { return "disable.test"; }
            public String getName() { return "Disable Test"; }
            public String getVersion() { return "1.0.0"; }
            public void onLoad() {}
            public void onUnload() { unloaded.set(true); }
        });

        registry.disable("disable.test");

        assertTrue(unloaded.get(), "onUnload should be called on disable");
        assertFalse(registry.isEnabled("disable.test"));
    }

    @Test
    void enable_afterDisable_callsOnLoadAndMarksEnabled() {
        AtomicBoolean loadCalled = new AtomicBoolean(false);

        registry.register(new QuartierConnectPlugin() {
            public String getId() { return "enable.after.disable"; }
            public String getName() { return "Re-enable Test"; }
            public String getVersion() { return "1.0.0"; }
            public void onLoad() { loadCalled.set(true); }
            public void onUnload() {}
        });

        registry.disable("enable.after.disable");
        loadCalled.set(false);

        registry.enable("enable.after.disable");

        assertTrue(loadCalled.get(), "onLoad should be called on enable");
        assertTrue(registry.isEnabled("enable.after.disable"));
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
