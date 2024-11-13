import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api';
import { ApiResponse } from '@/types/api';

export interface WeightClass {
  weight_class_id: number;
  name: string;
  division: string;
  weight_limit: number;
  display_order: number;
}

export interface RankedFighter {
  fighter_id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  win_loss_record: string;
  rank: number;
  previous_rank: number;
  points: number;
  weight_class: string;
  division: string;
  image_url: string | null;
}

export const RankingsService = {
  async getWeightClasses(): Promise<ApiResponse<WeightClass[]>> {
    return apiClient<WeightClass[]>(`${API_ENDPOINTS.RANKINGS}/weight-classes`);
  },

  async getAnalyticsRankings(weightClassId: number): Promise<ApiResponse<RankedFighter[]>> {
    return apiClient<RankedFighter[]>(`${API_ENDPOINTS.RANKINGS}/analytics/${weightClassId}`);
  }
}; 