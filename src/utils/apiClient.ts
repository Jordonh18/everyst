/**
 * Enhanced API utility with automatic token refresh and better error handling
 * for fixing session deauthentication issues.
 */

import { getApiUrl } from './apiUrl';
import { isTokenExpired } from './jwtUtils';

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipAutoRefresh?: boolean;
}

class ApiClient {
  private refreshPromise: Promise<boolean> | null = null;
  private tokenRefreshInProgress = false;

  /**
   * Get the current access token
   */
  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  /**
   * Get the current refresh token
   */
  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Check if the current access token needs refresh
   */
  private shouldRefreshToken(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    // Check if token is expired or will expire in the next 5 minutes
    try {
      return isTokenExpired(token);
    } catch (error) {
      console.warn('Error checking token expiration:', error);
      return true; // If we can't check, assume we need refresh
    }
  }

  /**
   * Refresh the access token
   */
  private async refreshAccessToken(): Promise<boolean> {
    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Mark refresh as in progress
    this.tokenRefreshInProgress = true;
    
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
      this.tokenRefreshInProgress = false;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performTokenRefresh(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      console.warn('No refresh token available');
      this.clearAuthState();
      return false;
    }

    try {
      const response = await fetch(`${getApiUrl()}/auth/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh: refreshToken })
      });

      if (!response.ok) {
        console.warn('Token refresh failed:', response.status);
        this.clearAuthState();
        return false;
      }

      const data = await response.json();
      
      // Update tokens in localStorage
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('authToken', data.access); // For backward compatibility
      
      // If refresh token was rotated, update it too
      if (data.refresh) {
        localStorage.setItem('refreshToken', data.refresh);
      }

      console.debug('Token refreshed successfully');
      return true;

    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearAuthState();
      return false;
    }
  }

  /**
   * Clear authentication state (tokens and redirect to login)
   */
  private clearAuthState(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('authToken');
    
    // Trigger a custom event that the AuthContext can listen to
    window.dispatchEvent(new CustomEvent('auth:logout', { 
      detail: { reason: 'token_expired' } 
    }));
  }

  /**
   * Make an authenticated API request with automatic token refresh
   */
  async request<T = unknown>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { skipAuth = false, skipAutoRefresh = false, ...fetchOptions } = options;

    // Build the full URL
    const url = endpoint.startsWith('http') ? endpoint : `${getApiUrl()}${endpoint}`;

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add any additional headers from options
    if (fetchOptions.headers) {
      Object.assign(headers, fetchOptions.headers);
    }

    // Add authorization header if not skipped
    if (!skipAuth) {
      // Check if we need to refresh the token before making the request
      if (!skipAutoRefresh && this.shouldRefreshToken() && !this.tokenRefreshInProgress) {
        console.debug('Token needs refresh before request, refreshing...');
        const refreshed = await this.refreshAccessToken();
        if (!refreshed) {
          return {
            status: 401,
            error: 'Authentication failed - unable to refresh token'
          };
        }
      }

      const token = this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      // Make the request
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Handle 401 responses by attempting token refresh
      if (response.status === 401 && !skipAuth && !skipAutoRefresh) {
        console.debug('Received 401, attempting token refresh...');
        
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the original request with the new token
          const newToken = this.getAccessToken();
          if (newToken) {
            const retryHeaders = {
              ...headers,
              'Authorization': `Bearer ${newToken}`,
            };

            const retryResponse = await fetch(url, {
              ...fetchOptions,
              headers: retryHeaders,
            });

            if (retryResponse.ok) {
              const retryData = await retryResponse.json().catch(() => null);
              return {
                status: retryResponse.status,
                data: retryData,
              };
            }
          }
        }
        
        // If refresh failed or retry still got 401, clear auth state
        this.clearAuthState();
        return {
          status: 401,
          error: 'Authentication failed - session expired'
        };
      }

      // Parse response
      let data: T | null = null;
      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
          data = await response.json();
        } catch (error) {
          console.warn('Failed to parse JSON response:', error);
        }
      }

      return {
        status: response.status,
        data: data || undefined,
        error: response.ok ? undefined : ((data as Record<string, unknown>)?.detail as string) || `Request failed with status ${response.status}`,
      };

    } catch (error) {
      console.error('API request failed:', error);
      return {
        status: 0,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Convenience method for GET requests
   */
  async get<T = unknown>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * Convenience method for POST requests
   */
  async post<T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Convenience method for PUT requests
   */
  async put<T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Convenience method for PATCH requests
   */
  async patch<T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete<T = unknown>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Check if the user is currently authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      return !isTokenExpired(token);
    } catch {
      return false;
    }
  }

  /**
   * Manually refresh the token (can be called by components)
   */
  async manualRefresh(): Promise<boolean> {
    return this.refreshAccessToken();
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();

// Export the class for testing
export { ApiClient };
