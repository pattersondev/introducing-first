import { useState, useEffect } from 'react';
import { UserService } from '@/services/user-service';
import { AUTH_BASE_URL, API_ENDPOINTS } from '@/config/api';

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
      setIsLoading(true);
      
      // Try to get token from localStorage if cookie fails
      const storedToken = localStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const response = await fetch(`${AUTH_BASE_URL}${API_ENDPOINTS.AUTH.STATUS}`, {
        method: 'GET',
        credentials: 'include',
        headers
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        const errorText = await response.text();
        console.error('Auth check failed:', response.status, errorText);
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('auth_token'); // Clear stored token on auth failure
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, delayUpdate: boolean = false) => {
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      const response = await fetch(`${AUTH_BASE_URL}/login`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
        }
        
        if (!delayUpdate) {
          // Immediately update auth state after successful login
          await checkAuthStatus();
        }
        
        return { success: true };
      } else {
        const error = await response.text();
        console.error('Login failed:', response.status, error);
        return { success: false, error };
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
        // Clear local storage
        localStorage.removeItem('auth_token');
        // Immediately update state
        setUser(null);
        setIsAuthenticated(false);
        return { success: true };
      } else {
        return { 
          success: false, 
          error: response.error || 'Logout failed' 
        };
      }
    } catch (error) {
      console.error('Logout failed:', error);
      return { 
        success: false, 
        error: 'Logout failed' 
      };
    }
  };

  const register = async (data: {
    username: string;
    password: string;
    email: string;
    phone: string;
  }, delayUpdate: boolean = false) => {
    try {
      const response = await UserService.register(data);
      
      if (response.status === 200) {
        // After successful registration, automatically log in with delay
        const loginResult = await login(data.email, data.password, delayUpdate);
        if (loginResult.success) {
          return { success: true };
        } else {
          return { success: false, error: "Registration successful but login failed. Please try logging in." };
        }
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