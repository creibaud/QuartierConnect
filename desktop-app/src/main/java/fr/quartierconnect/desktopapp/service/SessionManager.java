package fr.quartierconnect.desktopapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import fr.quartierconnect.desktopapp.model.AuthSession;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Map;

/**
 * SessionManager - Persiste les sessions utilisateur localement et via cookies.
 * Permet le vrai SSO entre l'app desktop et le web.
 * 
 * Les tokens sont stockés dans un fichier local (~/.quartierconnect/session.json)
 * et aussi transmis via HTTP Bearer token + cookies pour le web.
 */
public class SessionManager {

  private static final String SESSION_DIR = System.getProperty("user.home") + "/.quartierconnect";
  private static final String SESSION_FILE = SESSION_DIR + "/session.json";
  private static final long REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // Refresh si < 5min avant expiration

  private static final ObjectMapper objectMapper = new ObjectMapper();
  private static AuthSession currentSession;

  /**
   * Sauvegarde la session localement (fichier + mémoire)
   * Cela permet au web (localhost) de lire la même session via localStorage bridge
   */
  public static void saveSession(AuthSession session) {
    try {
      currentSession = session;

      // Créer le dossier si nécessaire
      File dir = new File(SESSION_DIR);
      if (!dir.exists()) {
        dir.mkdirs();
      }

      // Écrire la session dans un fichier JSON
      File file = new File(SESSION_FILE);
      objectMapper.writerWithDefaultPrettyPrinter().writeValue(file, session);

      // Restreindre les permissions du fichier (lecture/écriture propriétaire seulement)
      file.setReadable(false, false);
      file.setReadable(true, true);
      file.setWritable(false, false);
      file.setWritable(true, true);

      System.out.println("✅ Session saved to: " + SESSION_FILE);
    } catch (IOException e) {
      System.err.println("❌ Failed to save session: " + e.getMessage());
    }
  }

  /**
   * Charge la session depuis le fichier local
   * Retourne null si la session a expiré ou n'existe pas
   */
  public static AuthSession loadSession() {
    try {
      File file = new File(SESSION_FILE);
      if (!file.exists()) {
        return null;
      }

      AuthSession session = objectMapper.readValue(file, AuthSession.class);

      // Vérifier l'expiration du token
      if (session.getAccessToken() != null && !isTokenExpired(session)) {
        currentSession = session;
        System.out.println("✅ Session loaded from disk");
        return session;
      }

      // Session expirée
      System.out.println("⚠️  Session expired");
      clearSession();
      return null;
    } catch (IOException e) {
      System.err.println("❌ Failed to load session: " + e.getMessage());
      return null;
    }
  }

  /**
   * Obtient la session courante (en mémoire ou disque)
   */
  public static AuthSession getCurrentSession() {
    if (currentSession != null) {
      return currentSession;
    }
    return loadSession();
  }

  /**
   * Supprime la session locale
   */
  public static void clearSession() {
    currentSession = null;
    try {
      File file = new File(SESSION_FILE);
      if (file.exists()) {
        Files.delete(Paths.get(SESSION_FILE));
        System.out.println("✅ Session cleared");
      }
    } catch (IOException e) {
      System.err.println("❌ Failed to clear session: " + e.getMessage());
    }
  }

  /**
   * Vérifie si le token JWT est expiré (décodage simplifié sans dépendance externe)
   */
  private static boolean isTokenExpired(AuthSession session) {
    if (session.getAccessToken() == null) {
      return true;
    }

    try {
      // JWT format: header.payload.signature
      String[] parts = session.getAccessToken().split("\\.");
      if (parts.length != 3) {
        return true;
      }

      // Décoder le payload (base64)
      String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
      
      // Parser JSON manuellement pour éviter les problèmes Jackson/Module
      @SuppressWarnings("unchecked")
      Map<String, Object> decoded = objectMapper.readValue(payload, Map.class);

      // Comparer le timestamp d'expiration
      if (decoded.containsKey("exp")) {
        Object expObj = decoded.get("exp");
        long expirationTime = 0;
        
        if (expObj instanceof Integer) {
          expirationTime = ((Integer) expObj).longValue() * 1000;
        } else if (expObj instanceof Long) {
          expirationTime = ((Long) expObj) * 1000;
        } else {
          return true;
        }

        long currentTime = System.currentTimeMillis();
        long timeUntilExpiration = expirationTime - currentTime;

        // Refresh si moins de 5 minutes avant expiration
        if (timeUntilExpiration < REFRESH_THRESHOLD_MS) {
          System.out.println("⚠️  Token expiring soon, refresh needed");
          return true;
        }

        return timeUntilExpiration <= 0;
      }
    } catch (Exception e) {
      System.err.println("⚠️  Error checking token expiration: " + e.getMessage());
      return true;
    }

    return false;
  }
}
