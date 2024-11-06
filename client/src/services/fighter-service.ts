import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api';
import { Fighter, ApiResponse } from '@/types/api';

export const FighterService = {
  async getFighter(fighterId: string): Promise<ApiResponse<Fighter>> {
    return apiClient<Fighter>(`${API_ENDPOINTS.FIGHTERS}/${fighterId}`);
  },

//   async getFighterAnalytics(fighterId: string): Promise<ApiResponse<FighterAnalytics>> {
//     return apiClient<FighterAnalytics>(
//       `${API_ENDPOINTS.ANALYTICS}/fighter-style/${fighterId}`
//     );
//   },

//   async getFighterStyleEvolution(fighterId: string): Promise<ApiResponse<FighterAnalytics['styleEvolution']>> {
//     return apiClient(
//       `${API_ENDPOINTS.ANALYTICS}/style-evolution/${fighterId}`
//     );
//   },

  // Add other analytics methods as needed
}; 