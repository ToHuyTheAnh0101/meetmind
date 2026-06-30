import { useEffect, useRef } from 'react';
import { getToken } from '@/lib/tokenStorage';

/**
 * Custom hook to subscribe to Server-Sent Events (SSE).
 * Handles auto-authorization tokens, connection management, and automatic cleanup.
 */
export function useSSE<T = any>(
  path: string | null,
  onMessage: (data: T) => void,
  onError?: (err: Event) => void
) {
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);

  // Keep references updated without re-running the effect
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
  }, [onMessage, onError]);

  useEffect(() => {
    if (!path) return;

    const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const token = getToken() || "";
    const url = `${apiBaseUrl}${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageRef.current(data);
      } catch (err) {
        console.error("Failed to parse SSE event data:", err);
      }
    };

    eventSource.onerror = (err) => {
      if (onErrorRef.current) {
        onErrorRef.current(err);
      } else {
        console.error("SSE connection error for path:", path, err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [path]);
}
