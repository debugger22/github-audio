import { useEffect, useRef, useState, useCallback } from 'react';

export interface GitHubEvent {
  id: string;
  type: string;
  action?: string;
  repo: {
    name: string;
  };
  actor: {
    login: string;
    display_login: string;
  };
  payload?: any;
  created_at: string;
  event_url?: string;
}

interface UseWebSocketReturn {
  isOnline: boolean;
  eventQueue: GitHubEvent[];
  clearEventQueue: () => void;
}

export const useWebSocket = (
  url: string,
  orgRepoFilter: string[]
): UseWebSocketReturn => {
  const [isOnline, setIsOnline] = useState(false);
  const [eventQueue, setEventQueue] = useState<GitHubEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const clearEventQueue = useCallback(() => {
    setEventQueue([]);
  }, []);

  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(url);
      
      ws.addEventListener('open', () => {
        setIsOnline(true);
        console.log('WebSocket connected');
      });

      ws.addEventListener('close', () => {
        setIsOnline(false);
        console.log('WebSocket disconnected');
      });

      ws.addEventListener('error', (error) => {
        setIsOnline(false);
        console.error('WebSocket error:', error);
      });

      ws.addEventListener('message', (event) => {
        try {
          const events = JSON.parse(event.data);
          if (Array.isArray(events)) {
            setEventQueue(prev => {
              let filteredEvents = events;
              
              // Apply organization/repository filter
              if (orgRepoFilter.length > 0 && orgRepoFilter[0] !== '') {
                const filterRegex = new RegExp(orgRepoFilter.join('|'), 'i');
                filteredEvents = events.filter((event: GitHubEvent) => 
                  filterRegex.test(event.repo.name) && 
                  !event.repo.name.includes('github.io')
                );
              }
              
              const newQueue = [...prev, ...filteredEvents];
              // Keep only last 128 events
              return newQueue.slice(-128);
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  // Clear queue when filter changes
  useEffect(() => {
    setEventQueue([]);
  }, [orgRepoFilter]);

  return {
    isOnline,
    eventQueue,
    clearEventQueue,
  };
}; 