import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api';
import { Fighter, DetailedFighter, ApiResponse, TeammateFighter } from '@/types/api';

interface PopularFighter extends Fighter {
  search_count: number;
}

interface SearchResponse {
  fighters: Fighter[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface TeammatesResponse {
  success: boolean;
  data: TeammateFighter[];
}

export const FighterService = {
  async getFighter(fighterId: string): Promise<ApiResponse<DetailedFighter>> {
    return apiClient<DetailedFighter>(`${API_ENDPOINTS.FIGHTERS}/${fighterId}`);
  },

  async searchFighters(query: string, page: number = 1, limit: number = 10): Promise<ApiResponse<SearchResponse>> {
    return apiClient<SearchResponse>(
      `${API_ENDPOINTS.FIGHTERS}/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    );
  },

  async getPopularFighters(limit: number = 10): Promise<ApiResponse<PopularFighter[]>> {
    return apiClient<PopularFighter[]>(`${API_ENDPOINTS.FIGHTERS}/popular?limit=${limit}`);
  },

  async trackFighterClick(fighterId: string): Promise<ApiResponse<void>> {
    return apiClient<void>(`${API_ENDPOINTS.FIGHTERS}/${fighterId}/track`, {
      method: 'POST'
    });
  },

  async getFightersByRank(): Promise<ApiResponse<Fighter[]>> {
    return apiClient<Fighter[]>(`${API_ENDPOINTS.FIGHTERS}/promotion-rankings`);
  },

  async getTeammates(fighterId: string): Promise<ApiResponse<TeammatesResponse>> {
    return apiClient<TeammatesResponse>(`${API_ENDPOINTS.FIGHTERS}/${fighterId}/teammates`);
  }
}; 