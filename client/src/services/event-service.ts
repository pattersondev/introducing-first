import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api';
import { Event, ApiResponse } from '@/types/api';

export const EventService = {
  async getAllEvents(): Promise<ApiResponse<Event[]>> {
    return apiClient<Event[]>(API_ENDPOINTS.EVENTS);
  },

  async getEvent(eventId: string): Promise<ApiResponse<Event>> {
    return apiClient<Event>(`${API_ENDPOINTS.EVENTS}/${eventId}`);
  },
}; 