package fr.quartierconnect.desktopapp.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class AuthSession {

  private String accessToken;
  private String tokenType;
  private int expiresIn;
  private UserInfo user;

  public String getAccessToken() {
    return accessToken;
  }

  public void setAccessToken(String accessToken) {
    this.accessToken = accessToken;
  }

  public String getTokenType() {
    return tokenType;
  }

  public void setTokenType(String tokenType) {
    this.tokenType = tokenType;
  }

  public int getExpiresIn() {
    return expiresIn;
  }

  public void setExpiresIn(int expiresIn) {
    this.expiresIn = expiresIn;
  }

  public UserInfo getUser() {
    return user;
  }

  public void setUser(UserInfo user) {
    this.user = user;
  }

  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class UserInfo {
    private String id;
    private String email;
    private String role;

    public String getId() {
      return id;
    }

    public void setId(String id) {
      this.id = id;
    }

    public String getEmail() {
      return email;
    }

    public void setEmail(String email) {
      this.email = email;
    }

    public String getRole() {
      return role;
    }

    public void setRole(String role) {
      this.role = role;
    }
  }
}
