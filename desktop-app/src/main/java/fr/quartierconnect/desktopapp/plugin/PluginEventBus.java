package fr.quartierconnect.desktopapp.plugin;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

public final class PluginEventBus {

    public enum Event {
        INCIDENTS_CHANGED,
        SYNC_STARTED,
        SYNC_COMPLETED,
        SYNC_FAILED,
        ONLINE_STATUS_CHANGED
    }

    public record EventData(Event event, Object payload) {}

    private final List<Consumer<EventData>> listeners = new CopyOnWriteArrayList<>();

    public void subscribe(Consumer<EventData> listener) {
        listeners.add(listener);
    }

    public void unsubscribe(Consumer<EventData> listener) {
        listeners.remove(listener);
    }

    public void publish(Event event) {
        publish(event, null);
    }

    public void publish(Event event, Object payload) {
        EventData data = new EventData(event, payload);
        listeners.forEach(l -> {
            try { l.accept(data); } catch (Exception ignored) {}
        });
    }
}
