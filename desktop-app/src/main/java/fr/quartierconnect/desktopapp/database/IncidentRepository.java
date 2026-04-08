package fr.quartierconnect.desktopapp.database;

import fr.quartierconnect.desktopapp.services.ThreeWayMerger;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class IncidentRepository {

    public record Incident(
            int localId,
            String remoteId,
            String title,
            String description,
            String status,
            boolean isDirty,
            boolean isConflict,
            String createdAt,
            String updatedAt,
            String remoteTitle,
            String remoteDescription,
            String remoteStatus
    ) {}

    private static final String SELECT_COLUMNS =
            "id, remote_id, title, description, status, is_dirty, is_conflict, " +
            "created_at, updated_at, remote_title, remote_description, remote_status";

    public List<Incident> listAll() throws SQLException {
        String sql = "SELECT " + SELECT_COLUMNS + " FROM incidents ORDER BY created_at DESC";
        List<Incident> result = new ArrayList<>();
        try (Connection conn = SQLiteDatabase.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) result.add(map(rs));
        }
        return result;
    }

    public List<Incident> listDirty() throws SQLException {
        String sql = "SELECT " + SELECT_COLUMNS + " FROM incidents WHERE is_dirty = 1";
        List<Incident> result = new ArrayList<>();
        try (Connection conn = SQLiteDatabase.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) result.add(map(rs));
        }
        return result;
    }

    public List<Incident> listConflicts() throws SQLException {
        String sql = "SELECT " + SELECT_COLUMNS + " FROM incidents WHERE is_conflict = 1";
        List<Incident> result = new ArrayList<>();
        try (Connection conn = SQLiteDatabase.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) result.add(map(rs));
        }
        return result;
    }

    public int insertDirty(String title, String description) throws SQLException {
        String now = Instant.now().toString();
        String sql = "INSERT INTO incidents (title, description, status, is_dirty, created_at, updated_at) VALUES (?, ?, 'open', 1, ?, ?)";
        try (Connection conn = SQLiteDatabase.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, PreparedStatement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, title);
            stmt.setString(2, description);
            stmt.setString(3, now);
            stmt.setString(4, now);
            stmt.executeUpdate();
            try (ResultSet keys = stmt.getGeneratedKeys()) {
                if (keys.next()) return keys.getInt(1);
            }
        }
        return -1;
    }

    public void writeRemoteId(int localId, String remoteId) throws SQLException {
        String sql = "UPDATE incidents SET remote_id = ?, is_dirty = 0 WHERE id = ?";
        try (Connection conn = SQLiteDatabase.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, remoteId);
            stmt.setInt(2, localId);
            stmt.executeUpdate();
        }
    }

    public void markSynced(int localId) throws SQLException {
        String sql = "UPDATE incidents SET is_dirty = 0 WHERE id = ?";
        try (Connection conn = SQLiteDatabase.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, localId);
            stmt.executeUpdate();
        }
    }

    /**
     * Stores the ancestor snapshot for a local incident.
     * Called after a successful push so future pulls can compute a 3-way merge.
     */
    public void updateBase(int localId, String title, String description,
                           String status, String updatedAt) throws SQLException {
        String sql = """
                UPDATE incidents
                SET base_title = ?, base_description = ?, base_status = ?, base_updated_at = ?
                WHERE id = ?
                """;
        try (Connection conn = SQLiteDatabase.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, title);
            stmt.setString(2, description);
            stmt.setString(3, status);
            stmt.setString(4, updatedAt);
            stmt.setInt(5, localId);
            stmt.executeUpdate();
        }
    }

    /**
     * Accepts either the local or the remote version of a conflicted incident,
     * clears the conflict flag, and resets the base to the accepted values.
     */
    public void resolveConflict(int localId, boolean acceptRemote) throws SQLException {
        String selectSql = """
                SELECT title, description, status, updated_at,
                       remote_title, remote_description, remote_status
                FROM incidents WHERE id = ?
                """;
        try (Connection conn = SQLiteDatabase.getConnection();
             PreparedStatement select = conn.prepareStatement(selectSql)) {
            select.setInt(1, localId);
            try (ResultSet rs = select.executeQuery()) {
                if (!rs.next()) return;

                String resolvedTitle  = acceptRemote ? rs.getString("remote_title")       : rs.getString("title");
                String resolvedDesc   = acceptRemote ? rs.getString("remote_description") : rs.getString("description");
                String resolvedStatus = acceptRemote ? rs.getString("remote_status")      : rs.getString("status");
                String resolvedAt     = rs.getString("updated_at");

                String updateSql = """
                        UPDATE incidents
                        SET title = ?, description = ?, status = ?,
                            is_conflict = 0, is_dirty = ?,
                            remote_title = NULL, remote_description = NULL, remote_status = NULL,
                            base_title = ?, base_description = ?, base_status = ?, base_updated_at = ?
                        WHERE id = ?
                        """;
                try (PreparedStatement update = conn.prepareStatement(updateSql)) {
                    update.setString(1, resolvedTitle);
                    update.setString(2, resolvedDesc);
                    update.setString(3, resolvedStatus);
                    update.setInt(4, acceptRemote ? 0 : 1);
                    update.setString(5, resolvedTitle);
                    update.setString(6, resolvedDesc);
                    update.setString(7, resolvedStatus);
                    update.setString(8, resolvedAt);
                    update.setInt(9, localId);
                    update.executeUpdate();
                }
            }
        }
    }

    /**
     * Upserts a server incident using Three-Way Merge when an ancestor snapshot exists,
     * falling back to Last-Write-Wins when no base is available (first sync).
     *
     * Merge rules:
     *   - base == null         → LWW: server wins if serverUpdatedAt > localUpdatedAt
     *   - is_dirty == 1        → local has pending changes: 3WM runs to detect conflicts
     *   - clean 3WM result     → apply merged values, update base, clear dirty flag
     *   - conflict 3WM result  → set is_conflict=1, store pending remote values for UI
     */
    public void upsertFromServer(String remoteId, String remoteTitle, String remoteDescription,
                                 String remoteStatus, String serverUpdatedAt) throws SQLException {
        String selectSql = """
                SELECT id, title, description, status, is_dirty, updated_at,
                       base_title, base_description, base_status, base_updated_at
                FROM incidents WHERE remote_id = ?
                """;
        try (Connection conn = SQLiteDatabase.getConnection();
             PreparedStatement select = conn.prepareStatement(selectSql)) {
            select.setString(1, remoteId);
            try (ResultSet rs = select.executeQuery()) {
                if (rs.next()) {
                    applyMerge(conn, rs, remoteTitle, remoteDescription, remoteStatus, serverUpdatedAt);
                } else {
                    insertFromServer(conn, remoteId, remoteTitle, remoteDescription, remoteStatus, serverUpdatedAt);
                }
            }
        }
    }

    private void applyMerge(Connection conn, ResultSet rs,
                            String remoteTitle, String remoteDescription,
                            String remoteStatus, String serverUpdatedAt) throws SQLException {
        int localId      = rs.getInt("id");
        boolean isDirty  = rs.getInt("is_dirty") == 1;
        String baseTitle = rs.getString("base_title");

        boolean hasBase = baseTitle != null || rs.getString("base_description") != null
                || rs.getString("base_status") != null;

        if (!hasBase) {
            applyLww(conn, localId, isDirty, rs.getString("updated_at"),
                    remoteTitle, remoteDescription, remoteStatus, serverUpdatedAt);
            return;
        }

        ThreeWayMerger merger = new ThreeWayMerger();
        ThreeWayMerger.Snapshot base   = new ThreeWayMerger.Snapshot(
                rs.getString("base_title"), rs.getString("base_description"), rs.getString("base_status"));
        ThreeWayMerger.Snapshot local  = new ThreeWayMerger.Snapshot(
                rs.getString("title"), rs.getString("description"), rs.getString("status"));
        ThreeWayMerger.Snapshot remote = new ThreeWayMerger.Snapshot(remoteTitle, remoteDescription, remoteStatus);

        ThreeWayMerger.MergeResult result = merger.merge(base, local, remote);

        if (result.hasConflict()) {
            flagConflict(conn, localId, remoteTitle, remoteDescription, remoteStatus, serverUpdatedAt);
        } else {
            applyCleanMerge(conn, localId, result, serverUpdatedAt);
        }
    }

    private void applyLww(Connection conn, int localId, boolean isDirty,
                          String localUpdatedAt, String remoteTitle, String remoteDescription,
                          String remoteStatus, String serverUpdatedAt) throws SQLException {
        if (isDirty) return;
        if (serverUpdatedAt.compareTo(localUpdatedAt) <= 0) return;

        String sql = """
                UPDATE incidents
                SET title = ?, description = ?, status = ?, updated_at = ?,
                    base_title = ?, base_description = ?, base_status = ?, base_updated_at = ?
                WHERE id = ?
                """;
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, remoteTitle);
            stmt.setString(2, remoteDescription);
            stmt.setString(3, remoteStatus);
            stmt.setString(4, serverUpdatedAt);
            stmt.setString(5, remoteTitle);
            stmt.setString(6, remoteDescription);
            stmt.setString(7, remoteStatus);
            stmt.setString(8, serverUpdatedAt);
            stmt.setInt(9, localId);
            stmt.executeUpdate();
        }
    }

    private void applyCleanMerge(Connection conn, int localId,
                                 ThreeWayMerger.MergeResult result,
                                 String serverUpdatedAt) throws SQLException {
        String sql = """
                UPDATE incidents
                SET title = ?, description = ?, status = ?, updated_at = ?, is_dirty = 0, is_conflict = 0,
                    base_title = ?, base_description = ?, base_status = ?, base_updated_at = ?
                WHERE id = ?
                """;
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, result.title());
            stmt.setString(2, result.description());
            stmt.setString(3, result.status());
            stmt.setString(4, serverUpdatedAt);
            stmt.setString(5, result.title());
            stmt.setString(6, result.description());
            stmt.setString(7, result.status());
            stmt.setString(8, serverUpdatedAt);
            stmt.setInt(9, localId);
            stmt.executeUpdate();
        }
    }

    private void flagConflict(Connection conn, int localId,
                              String remoteTitle, String remoteDescription,
                              String remoteStatus, String serverUpdatedAt) throws SQLException {
        String sql = """
                UPDATE incidents
                SET is_conflict = 1, updated_at = ?,
                    remote_title = ?, remote_description = ?, remote_status = ?
                WHERE id = ?
                """;
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, serverUpdatedAt);
            stmt.setString(2, remoteTitle);
            stmt.setString(3, remoteDescription);
            stmt.setString(4, remoteStatus);
            stmt.setInt(5, localId);
            stmt.executeUpdate();
        }
    }

    private void insertFromServer(Connection conn, String remoteId,
                                  String title, String description,
                                  String status, String updatedAt) throws SQLException {
        String sql = """
                INSERT INTO incidents
                    (remote_id, title, description, status, is_dirty,
                     created_at, updated_at,
                     base_title, base_description, base_status, base_updated_at)
                VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
                """;
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, remoteId);
            stmt.setString(2, title);
            stmt.setString(3, description);
            stmt.setString(4, status);
            stmt.setString(5, updatedAt);
            stmt.setString(6, updatedAt);
            stmt.setString(7, title);
            stmt.setString(8, description);
            stmt.setString(9, status);
            stmt.setString(10, updatedAt);
            stmt.executeUpdate();
        }
    }

    private Incident map(ResultSet rs) throws SQLException {
        return new Incident(
                rs.getInt("id"),
                rs.getString("remote_id"),
                rs.getString("title"),
                rs.getString("description"),
                rs.getString("status"),
                rs.getInt("is_dirty") == 1,
                rs.getInt("is_conflict") == 1,
                rs.getString("created_at"),
                rs.getString("updated_at"),
                rs.getString("remote_title"),
                rs.getString("remote_description"),
                rs.getString("remote_status")
        );
    }
}
