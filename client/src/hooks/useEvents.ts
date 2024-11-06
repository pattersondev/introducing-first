import { useState, useEffect } from 'react';
import { Event, ApiResponse } from '@/types/api';
import { EventService } from '@/services/event-service';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await EventService.getAllEvents();
        if (response.error) {
          setError(response.error);
        } else if (response.data) {
          setEvents(response.data);
        }
      } catch (err) {
        setError('Failed to fetch events');
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  return { events, loading, error };
} 