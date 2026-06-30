import { useEffect, useRef } from 'react';

/**
 * Centrally managed custom event names to prevent typos.
 */
export const MeetingEvents = {
  REFRESH_MEETING: 'refresh-meeting',
  REFRESH_QA: 'refresh-qa',
  REFRESH_POLLS: 'refresh-polls',
  BREAKOUT_STARTED: 'breakout-started',
  BREAKOUT_ENDED: 'breakout-ended',
  RECORDING_STARTED: 'recording-started',
  RECORDING_STOPPED: 'recording-stopped',
  SEND_BREAKOUT_START_SIGNAL: 'send-breakout-start-signal',
  SEND_BREAKOUT_END_SIGNAL: 'send-breakout-end-signal',
} as const;

export type MeetingEventType = typeof MeetingEvents[keyof typeof MeetingEvents];

/**
 * Dispatches a typed CustomEvent globally on the window object.
 */
export function emitCustomEvent<T = any>(name: MeetingEventType | string, detail?: T) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/**
 * React hook to subscribe to a CustomEvent on the window object.
 * Handles listener subscription and automatic cleanup.
 */
export function useCustomEvent<T = any>(
  name: MeetingEventType | string,
  handler: (detail: T) => void
) {
  const handlerRef = useRef(handler);

  // Keep reference updated to avoid re-binding the listener
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<T>;
      handlerRef.current(customEvent.detail);
    };

    window.addEventListener(name, listener);
    return () => {
      window.removeEventListener(name, listener);
    };
  }, [name]);
}
