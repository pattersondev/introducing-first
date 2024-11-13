import { useState, useEffect, useRef } from 'react';
import { Event, ApiResponse } from '@/types/api';
import { EventService } from '@/services/event-service';

// Create a cache outside the hook with proper typing
let requestCache: {
  promise: Promise<ApiResponse<Event[]>> | null;
  timestamp: number | null;
} = {
  promise: null,
  timestamp: null
};

const CACHE_DURATION = 30000; // 30 seconds

export function useRecentAndUpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    async function fetchEvents() {
      try {
        // Check if we have a cached request that's still valid
        const now = Date.now();
        if (
          requestCache.promise && 
          requestCache.timestamp && 
          now - requestCache.timestamp < CACHE_DURATION
        ) {
          const response = await requestCache.promise;
          if (isMounted.current) {
            if (response?.error) {
              setError(response.error);
            } else if (response?.data) {
              setEvents(response.data);
            }
          }
        } else {
          console.log('Fetching new events');
          // Make a new request and cache it
          const newPromise = EventService.getRecentAndUpcomingEvents();
          requestCache = {
            promise: newPromise,
            timestamp: now
          };
          
          const response = await newPromise;
          if (isMounted.current) {
            if (response?.error) {
              setError(response.error);
            } else if (response?.data) {
              setEvents(response.data);
            }
          }
        }
      } catch (err: unknown) {
        if (isMounted.current && err instanceof Error && err.name !== 'AbortError') {
          setError('Failed to fetch events');
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    }

    fetchEvents();

    return () => {
      isMounted.current = false;
    };
  }, []);

  return { events, loading, error };
} 