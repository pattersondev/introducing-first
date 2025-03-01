import { AUTH_BASE_URL, API_ENDPOINTS } from '@/config/api';
import { ApiResponse } from '@/types/api';

interface RegisterData {
  username: string;
  password: string;
  email: string;
  phone: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  message: string;
}

const commonHeaders = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'Accept': 'application/json',
};

export const UserService = {
  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    try {
      const formData = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await fetch(`${AUTH_BASE_URL}${API_ENDPOINTS.AUTH.REGISTER}`, {
        method: 'POST',
        headers: commonHeaders,
        body: formData,
        credentials: 'include',
        mode: 'cors',
      });

      let responseData;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        responseData = { message: text };
      }

      return {
        data: responseData,
        status: response.status,
        error: !response.ok ? responseData.message || 'Registration failed' : undefined
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        status: 500,
        error: 'Failed to connect to authentication service'
      };
    }
  },

  async login(data: LoginData): Promise<ApiResponse<AuthResponse>> {
    try {
      const formData = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await fetch(`${AUTH_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
        method: 'POST',
        headers: commonHeaders,
        body: formData,
        credentials: 'include',
        mode: 'cors',
      });

      let responseData;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        responseData = { message: text };
      }

      return {
        data: responseData,
        status: response.status,
        error: !response.ok ? responseData.message || 'Login failed' : undefined
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        status: 500,
        error: 'Failed to connect to authentication service'
      };
    }
  },

  async logout(): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await fetch(`${AUTH_BASE_URL}${API_ENDPOINTS.AUTH.LOGOUT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        mode: 'cors',
      });

      let responseData;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        responseData = { message: text };
      }

      return {
        data: responseData,
        status: response.status,
        error: !response.ok ? responseData.message || 'Logout failed' : undefined
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        status: 500,
        error: 'Failed to connect to authentication service'
      };
    }
  },

  async uploadProfilePicture(file: File): Promise<ApiResponse<{ url: string }>> {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${AUTH_BASE_URL}/api/profile/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        mode: 'cors',
      });

      const data = await response.json();

      return {
        data,
        status: response.status,
        error: !response.ok ? data.message || 'Failed to upload profile picture' : undefined
      };
    } catch (error) {
      console.error('Profile picture upload error:', error);
      return {
        status: 500,
        error: 'Failed to upload profile picture'
      };
    }
  }
}; 