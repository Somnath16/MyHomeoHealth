import { apiRequest } from "./queryClient";
import type { User } from "@shared/schema";

export interface AuthUser extends Omit<User, 'password'> {}

export interface LoginResponse {
  user: AuthUser;
}

export const authApi = {
  login: async (username: string, password: string): Promise<AuthUser> => {
    const response = await apiRequest("POST", "/api/auth/login", {
      username,
      password,
    });
    const data: LoginResponse = await response.json();
    return data.user;
  },

  logout: async (): Promise<void> => {
    await apiRequest("POST", "/api/auth/logout");
  },

  getCurrentUser: async (): Promise<AuthUser | null> => {
    try {
      const response = await apiRequest("GET", "/api/auth/me");
      const data: LoginResponse = await response.json();
      return data.user;
    } catch (error) {
      return null;
    }
  },
};

export const isAuthenticated = (): boolean => {
  // This will be managed by the session on the server side
  // The frontend will rely on API calls to determine auth status
  return true; // Placeholder - actual auth state managed by React Query
};

export const hasRole = (user: AuthUser | null, roles: string[]): boolean => {
  if (!user || !user.role) return false;
  return roles.includes(user.role);
};

export const isDoctor = (user: AuthUser | null): boolean => {
  return hasRole(user, ['doctor']);
};

export const isAdmin = (user: AuthUser | null): boolean => {
  return hasRole(user, ['admin']);
};

export const isPatient = (user: AuthUser | null): boolean => {
  return hasRole(user, ['patient']);
};
