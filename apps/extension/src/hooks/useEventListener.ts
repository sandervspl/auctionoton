import { useEffect, useRef } from 'react';

export function useEventListener<K extends keyof HTMLElementEventMap>(
  eventName: K,
  handler: (e: HTMLElementEventMap[K]) => void,
  element: HTMLElement | Window | null = window,
): void {
  // Create a ref that stores handler
  const savedHandler = useRef<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Update ref.current value if handler changes.
  // This allows our effect below to always get latest handler
  // without us needing to pass it in effect deps array
  // and potentially cause effect to re-run every render.
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    // Make sure element supports addEventListener
    const isSupported = element && element.addEventListener;
    if (!isSupported) return;

    // Create event listener that calls handler function stored in ref
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventListener = (event: any) => savedHandler.current(event);

    // Add event listener
    element?.addEventListener(eventName, eventListener);

    // Remove event listener on cleanup
    return () => {
      element?.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]); // Re-run if eventName or element changes
}
