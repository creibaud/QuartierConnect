package fr.quartierconnect.desktopapp.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Three-way merge for incident fields, mirroring Git's conflict resolution strategy.
 *
 * Merge rules for each field F:
 *
 *   base == null (never synced)           → LWW fallback: take remote
 *   local == base  AND  remote == base    → no change (idempotent)
 *   local == base  AND  remote != base    → take remote  (only remote changed)
 *   local != base  AND  remote == base    → take local   (only local changed)
 *   local == remote                       → take either  (same edit, safe)
 *   local != base  AND  remote != base
 *              AND  local != remote       → CONFLICT
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
