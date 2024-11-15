import { useState, useEffect } from 'react';
import { UserService } from '@/services/user-service';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated (e.g., via cookie)
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // You'll need to add this endpoint to your auth service
      const response = await fetch('/api/auth/status', {
        credentials: 'include'  // Important for cookies
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await UserService.login({ username, password });
      
      if (response.status === 200) {
        await checkAuthStatus(); // Refresh user data after login
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      const response = await UserService.logout();
      
      if (response.status === 200) {
        setUser(null);
        setIsAuthenticated(false);
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false, error: 'Logout failed' };
    }
  };

  const register = async (data: {
    username: string;
    password: string;
    email: string;
    phone: string;
  }) => {
    try {
      const response = await UserService.register(data);
      
      if (response.status === 200) {
        await checkAuthStatus(); // Refresh user data after registration
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    refreshAuth: checkAuthStatus
  };
} 