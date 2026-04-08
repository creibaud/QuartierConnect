package fr.quartierconnect.desktopapp.database;

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
            String createdAt,
            String updatedAt
    ) {}

    public List<Incident> listAll() throws SQLException {
        String sql = "SELECT id, remote_id, title, description, status, is_dirty, created_at, updated_at FROM incidents ORDER BY created_at DESC";
        List<Incident> result = new ArrayList<>();
        try (Connection conn = SQLiteDatabase.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                result.add(map(rs));
            }
        }
        return result;
    }

    public List<Incident> listDirty() throws SQLException {
        String sql = "SELECT id, remote_id, title, description, status, is_dirty, created_at, updated_at FROM incidents WHERE is_dirty = 1";
        List<Incident> result = new ArrayList<>();
        try (Connection conn = SQLiteDatabase.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                result.add(map(rs));
            }
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
     * Upsert from server using LWW on updatedAt.
     * If remoteId already exists locally and the server's updatedAt is newer, update the row.
     * If it does not exist locally, insert it.
     * Dirty rows are never overwritten — local wins when is_dirty = 1.
     */
    public void upsertFromServer(String remoteId, String title, String description,
                                  String status, String serverUpdatedAt) throws SQLException {
        String selectSql = "SELECT id, is_dirty, updated_at FROM incidents WHERE remote_id = ?";
        try (Connection conn = SQLiteDatabase.getConnection();
             PreparedStatement select = conn.prepareStatement(selectSql)) {
            select.setString(1, remoteId);
            try (ResultSet rs = select.executeQuery()) {
                if (rs.next()) {
                    boolean isDirty = rs.getInt("is_dirty") == 1;
                    if (isDirty) return;
                    String localUpdatedAt = rs.getString("updated_at");
                    if (serverUpdatedAt.compareTo(localUpdatedAt) > 0) {
                        String updateSql = "UPDATE incidents SET title = ?, description = ?, status = ?, updated_at = ? WHERE remote_id = ?";
                        try (PreparedStatement update = conn.prepareStatement(updateSql)) {
                            update.setString(1, title);
                            update.setString(2, description);
                            update.setString(3, status);
                            update.setString(4, serverUpdatedAt);
                            update.setString(5, remoteId);
                            update.executeUpdate();
                        }
                    }
                } else {
                    String insertSql = "INSERT INTO incidents (remote_id, title, description, status, is_dirty, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)";
                    try (PreparedStatement insert = conn.prepareStatement(insertSql)) {
                        insert.setString(1, remoteId);
                        insert.setString(2, title);
                        insert.setString(3, description);
                        insert.setString(4, status);
                        insert.setString(5, serverUpdatedAt);
                        insert.setString(6, serverUpdatedAt);
                        insert.executeUpdate();
                    }
                }
            }
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
                rs.getString("created_at"),
                rs.getString("updated_at")
        );
    }
}
