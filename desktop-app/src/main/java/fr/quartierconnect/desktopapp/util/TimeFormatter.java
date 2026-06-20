package fr.quartierconnect.desktopapp.util;

import fr.quartierconnect.desktopapp.i18n.I18n;

public final class TimeFormatter {

    private TimeFormatter() {}

    public static String formatElapsed(long epochMillis) {
        if (epochMillis == 0) return I18n.get("time.never");
        long elapsed = (System.currentTimeMillis() - epochMillis) / 1000;
        if (elapsed < 5) return I18n.get("time.now");
        if (elapsed < 60) return I18n.get("time.secondsAgo", elapsed);
        if (elapsed < 3600) return I18n.get("time.minutesAgo", elapsed / 60);
        return I18n.get("time.hoursAgo", elapsed / 3600);
    }
}
