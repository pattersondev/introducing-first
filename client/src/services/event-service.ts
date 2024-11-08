import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api';
import { Event, ApiResponse } from '@/types/api';

type Promotion = 'ALL' | 'UFC' | 'BELLATOR' | 'PFL';

export const EventService = {
  async getAllEvents(): Promise<ApiResponse<Event[]>> {
    return apiClient<Event[]>(`${API_ENDPOINTS.EVENTS}`);
  },

  async getEvent(eventId: string): Promise<ApiResponse<Event>> {
    return apiClient<Event>(`${API_ENDPOINTS.EVENTS}/${eventId}`);
  },

  async searchEvents(searchTerm: string = '', promotion: Promotion = 'ALL'): Promise<ApiResponse<Event[]>> {
    const params = new URLSearchParams();
    if (searchTerm) params.append('q', searchTerm);
    if (promotion !== 'ALL') params.append('promotion', promotion);

    return apiClient<Event[]>(`${API_ENDPOINTS.EVENTS}/search?${params.toString()}`);
  }
}; 