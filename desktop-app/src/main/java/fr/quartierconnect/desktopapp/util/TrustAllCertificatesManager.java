package fr.quartierconnect.desktopapp.util;

import java.net.http.HttpClient;
import java.security.KeyStore;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

/**
 * TrustAllCertificatesManager - Crée un HttpClient qui accepte les certificats auto-signés.
 * ⚠️ À utiliser UNIQUEMENT en développement avec Caddy auto-signé
 */
public class TrustAllCertificatesManager {

  private static HttpClient httpClient;

  /**
   * Crée et retourne un HttpClient qui accepte tous les certificats SSL.
   * À appeler au démarrage après java.lang.Version check.
   */
  public static HttpClient createTrustAllHttpClient() {
    try {
      // Créer un TrustManager qui accepte TOUS les certificats
      X509TrustManager trustAllManager = new X509TrustManager() {
        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType)
            throws CertificateException {}

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType)
            throws CertificateException {
          // Accepter tous les certificats (même auto-signés)
        }

        @Override
        public X509Certificate[] getAcceptedIssuers() {
          return new X509Certificate[0];
        }
      };

      // Créer un SSLContext avec le TrustManager permissif
      SSLContext sslContext = SSLContext.getInstance("TLS");
      sslContext.init(null, new TrustManager[] {trustAllManager}, null);

      // Créer un HttpClient avec ce SSLContext
      httpClient =
          HttpClient.newBuilder()
              .sslContext(sslContext)
              .connectTimeout(java.time.Duration.ofSeconds(10))
              .build();

      System.out.println("✅ HttpClient configured to accept self-signed certificates (dev mode)");
      return httpClient;

    } catch (Exception e) {
      System.err.println("❌ Failed to create HttpClient with trust-all SSL: " + e.getMessage());
      e.printStackTrace();

      // Fallback à un client normal
      return HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(10)).build();
    }
  }

  /**
   * Retourne le client HTTP singleton
   */
  public static HttpClient getHttpClient() {
    if (httpClient == null) {
      httpClient = createTrustAllHttpClient();
    }
    return httpClient;
  }
}
