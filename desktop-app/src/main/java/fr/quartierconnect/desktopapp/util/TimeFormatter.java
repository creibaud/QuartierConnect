package fr.quartierconnect.desktopapp.util;

public final class TimeFormatter {

    private TimeFormatter() {}

    public static String formatElapsed(long epochMillis) {
        if (epochMillis == 0) return "Jamais synchronisé";
        long elapsed = (System.currentTimeMillis() - epochMillis) / 1000;
        if (elapsed < 5) return "Maintenant";
        if (elapsed < 60) return "il y a " + elapsed + "s";
        if (elapsed < 3600) return "il y a " + (elapsed / 60) + " min";
        return "il y a " + (elapsed / 3600) + "h";
    }
}
