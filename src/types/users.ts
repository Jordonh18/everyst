/**
 * User types for the application
 */

export interface UserRole {
  name: string;
  description: string;
  priority: number;
  can_manage_users: boolean;
  can_manage_system: boolean;
  can_manage_network: boolean;
  can_view_all_data: boolean;
  can_view_logs: boolean;
}

export interface User {
  id: string | number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  date_joined?: string;
  last_login?: string;
  role?: string;
  role_details?: UserRole;
  session_timeout_minutes?: number;
}

export interface UserLoginRequest {
  username: string;
  password: string;
}

export interface UserRegistrationRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user?: User;
}

// No default export needed for TypeScript interfaces
