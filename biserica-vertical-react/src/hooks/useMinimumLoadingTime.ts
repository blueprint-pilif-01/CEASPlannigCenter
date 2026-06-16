import { useState, useEffect, useRef } from 'react';

/**
 * Hook to prevent loading flickering by enforcing a minimum display time
 *
 * @param actualLoading - The actual loading state from your async operations
 * @param minimumTime - Minimum time (in ms) to show loading state (default: 300ms)
 * @returns displayLoading - The loading state that should be displayed
 *
 * Example:
 * ```typescript
 * const [loading, setLoading] = useState(true);
 * const displayLoading = useMinimumLoadingTime(loading);
 *
 * // Use displayLoading for UI rendering instead of loading
 * if (displayLoading) return <LoadingSpinner />;
 * ```
 */
export function useMinimumLoadingTime(actualLoading: boolean, minimumTime: number = 300): boolean {
  const [displayLoading, setDisplayLoading] = useState(actualLoading);
  const loadingStartTime = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // When loading starts
    if (actualLoading && !displayLoading) {
      loadingStartTime.current = Date.now();
      setDisplayLoading(true);
    }

    // When loading finishes
    if (!actualLoading && displayLoading) {
      const elapsed = Date.now() - (loadingStartTime.current || 0);
      const remainingTime = Math.max(0, minimumTime - elapsed);

      if (remainingTime > 0) {
        // Keep loading visible for the remaining time
        timeoutRef.current = setTimeout(() => {
          setDisplayLoading(false);
          loadingStartTime.current = null;
        }, remainingTime);
      } else {
        // Minimum time already elapsed
        setDisplayLoading(false);
        loadingStartTime.current = null;
      }
    }

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [actualLoading, displayLoading, minimumTime]);

  return displayLoading;
}
