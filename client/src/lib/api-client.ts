import { API_BASE_URL, API_TIMEOUT } from '@/config/api';
import { ApiResponse } from '@/types/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithTimeout(
  resource: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = API_TIMEOUT } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.error || 'An unexpected error occurred'
      );
    }

    return {
      data: data as T,
      status: response.status,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        error: error.message,
        status: error.status,
      };
    }
    return {
      error: 'Network error or server is unreachable',
      status: 500,
    };
  }
} 