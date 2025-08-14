/**
 * JWT utilities for extracting user information from tokens on the frontend.
 * This helps reduce API calls by using token claims when available.
 */

export interface JwtPayload {
  user_id: string | number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  session_timeout_minutes?: number;
  role?: string;
  role_details?: {
    name: string;
    description: string;
    priority: number;
    can_manage_users: boolean;
    can_manage_system: boolean;
    can_manage_network: boolean;
    can_view_all_data: boolean;
    can_view_logs: boolean;
  };
  exp?: number;
  iat?: number;
}

/**
 * Decode a JWT token and return the payload.
 * Note: This is client-side decoding for reading claims only.
 * Token verification should always be done on the server.
 */
export function decodeJwtToken(token: string): JwtPayload | null {
  try {
    // Split the token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid JWT token format');
      return null;
    }

    // Decode the payload (base64url)
    const payload = parts[1];
    
    // Add padding if needed
    const paddedPayload = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    
    // Decode from base64url
    const decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
    
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.warn('Error decoding JWT token:', error);
    return null;
  }
}

/**
 * Check if a JWT token is expired.
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtToken(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

/**
 * Get user information from JWT token claims.
 * This can be used to reduce API calls for basic user info.
 */
export function getUserInfoFromToken(token: string): Partial<import('../types/users').User> | null {
  const payload = decodeJwtToken(token);
  if (!payload) {
    return null;
  }

  return {
    id: payload.user_id,
    username: payload.username,
    email: payload.email,
    first_name: payload.first_name || '',
    last_name: payload.last_name || '',
    is_active: payload.is_active ?? true,
    is_staff: payload.is_staff ?? false,
    is_superuser: payload.is_superuser ?? false,
    session_timeout_minutes: payload.session_timeout_minutes ?? 30,
    role: payload.role || undefined,
    role_details: payload.role_details || undefined,
  };
}

/**
 * Check if the token claims might be outdated and should be refreshed.
 * This is useful for determining when to fall back to API calls.
 */
export function shouldRefreshTokenClaims(token: string): boolean {
  const payload = decodeJwtToken(token);
  if (!payload) {
    return true;
  }

  // Check if essential claims are missing
  const essentialClaims = ['username', 'email', 'is_active'];
  for (const claim of essentialClaims) {
    if (!(claim in payload)) {
      return true;
    }
  }

  // Check if token is close to expiring (within 5 minutes)
  if (payload.exp) {
    const currentTime = Math.floor(Date.now() / 1000);
    const fiveMinutes = 5 * 60;
    if (payload.exp - currentTime < fiveMinutes) {
      return true;
    }
  }

  return false;
}

/**
 * Extract role information from JWT token.
 */
export function getRoleFromToken(token: string): { role?: string; role_details?: JwtPayload['role_details'] } {
  const payload = decodeJwtToken(token);
  if (!payload) {
    return {};
  }

  return {
    role: payload.role,
    role_details: payload.role_details,
  };
}
