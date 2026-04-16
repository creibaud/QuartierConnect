package fr.quartierconnect.desktopapp.ui.layout;

import javafx.scene.layout.HBox;

public class StatusBar extends HBox {

    public void update(boolean online, long lastSyncEpoch) {}

    public void updateConflictStats(long conflicts, long dirty) {}
}
