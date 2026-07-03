package fr.quartierconnect.desktopapp.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Fusion à trois voies des champs d'un incident, calquée sur la stratégie de résolution de conflits de Git.
 *
 * Règles de fusion pour chaque champ F :
 *
 *   base == null (jamais synchronisé)     → repli LWW : prendre le distant
 *   local == base  ET  distant == base    → aucun changement (idempotent)
 *   local == base  ET  distant != base    → prendre le distant  (seul le distant a changé)
 *   local != base  ET  distant == base    → prendre le local    (seul le local a changé)
 *   local == distant                      → prendre l'un ou l'autre  (même modification, sans risque)
 *   local != base  ET  distant != base
 *              ET  local != distant       → CONFLIT
 */
public class ThreeWayMerger {

    public enum Outcome { CLEAN, CONFLICT }

    public record MergeResult(
            String title,
            String description,
            String status,
            Outcome outcome,
            List<String> conflictFields
    ) {
        public boolean hasConflict() {
            return outcome == Outcome.CONFLICT;
        }
    }

    public record Snapshot(String title, String description, String status) {}

    public MergeResult merge(Snapshot base, Snapshot local, Snapshot remote) {
        if (base == null) {
            return new MergeResult(remote.title(), remote.description(), remote.status(),
                    Outcome.CLEAN, List.of());
        }

        List<String> conflictFields = new ArrayList<>();

        String title       = resolveField("title",       base.title(),       local.title(),       remote.title(),       conflictFields);
        String description = resolveField("description", base.description(), local.description(), remote.description(), conflictFields);
        String status      = resolveField("status",      base.status(),      local.status(),      remote.status(),      conflictFields);

        Outcome outcome = conflictFields.isEmpty() ? Outcome.CLEAN : Outcome.CONFLICT;
        return new MergeResult(title, description, status, outcome, List.copyOf(conflictFields));
    }

    private String resolveField(String fieldName,
                                String base, String local, String remote,
                                List<String> conflictFields) {
        boolean localChanged  = !Objects.equals(local,  base);
        boolean remoteChanged = !Objects.equals(remote, base);

        if (!localChanged && !remoteChanged) return local;
        if (!localChanged)                   return remote;
        if (!remoteChanged)                  return local;
        if (Objects.equals(local, remote))   return local;

        conflictFields.add(fieldName);
        return local;
    }
}
