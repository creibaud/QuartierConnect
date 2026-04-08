package fr.quartierconnect.desktopapp.plugin;

import fr.quartierconnect.desktopapp.services.ApiService;
import fr.quartierconnect.desktopapp.services.AuthService;

/**
 * Provides plugins with controlled access to application services.
 * Passed to {@link PluginRegistry#register(QuartierConnectPlugin, AppContext)}.
 */
public final class AppContext {

    private final ApiService apiService;
    private final AuthService authService;

    public AppContext(ApiService apiService, AuthService authService) {
        this.apiService = apiService;
        this.authService = authService;
    }

    public ApiService getApiService() {
        return apiService;
    }

    public AuthService getAuthService() {
        return authService;
    }
}
