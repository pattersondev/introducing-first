import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api';
import { Event, ApiResponse } from '@/types/api';

type Promotion = 'ALL' | 'UFC' | 'BELLATOR' | 'PFL' | 'DWCS';

export const EventService = {
  async getAllEvents(): Promise<ApiResponse<Event[]>> {
    return apiClient<Event[]>(`${API_ENDPOINTS.EVENTS}`);
  },

  async getEvent(eventId: string): Promise<ApiResponse<Event>> {
    const cleanEventId = eventId.split('?')[0];
    return apiClient<Event>(`${API_ENDPOINTS.EVENTS}/${cleanEventId}`);
  },

  async searchEvents(searchTerm: string = '', promotion: Promotion = 'ALL'): Promise<ApiResponse<Event[]>> {
    const params = new URLSearchParams();
    if (searchTerm) params.append('q', searchTerm);
    if (promotion !== 'ALL') params.append('promotion', promotion);

    return apiClient<Event[]>(`${API_ENDPOINTS.EVENTS}/search?${params.toString()}`);
  },

  async getUpcomingEvents(limit: number = 7): Promise<ApiResponse<Event[]>> {
    return apiClient<Event[]>(`${API_ENDPOINTS.EVENTS}/upcoming?limit=${limit}`);
  },

  async getRecentAndUpcomingEvents(): Promise<ApiResponse<Event[]>> {
    return apiClient<Event[]>(`${API_ENDPOINTS.EVENTS}/recent-and-upcoming`);
  }
}; 