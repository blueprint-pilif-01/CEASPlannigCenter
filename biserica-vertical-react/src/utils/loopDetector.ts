/**
 * Detect infinite re-render loops
 *
 * Usage:
 * ```typescript
 * import { detectLoop } from '../utils/loopDetector';
 *
 * function MyComponent() {
 *   detectLoop('MyComponent');
 *   // ... rest of component
 * }
 * ```
 */

const renderCounts = new Map<string, number>();
const resetTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function detectLoop(componentName: string, threshold: number = 50): void {
  // Get current count
  const count = (renderCounts.get(componentName) || 0) + 1;
  renderCounts.set(componentName, count);

  // Clear existing reset timer
  const existingTimer = resetTimers.get(componentName);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new reset timer (reset count after 2 seconds of no renders)
  const newTimer = setTimeout(() => {
    renderCounts.set(componentName, 0);
  }, 2000);
  resetTimers.set(componentName, newTimer);

  // Check if threshold exceeded
  if (count > threshold) {
    console.error(
      `🔴 INFINITE LOOP DETECTED in ${componentName}!`,
      `Rendered ${count} times in 2 seconds.`,
      'This will cause performance issues and battery drain.'
    );

    // Show user-friendly alert
    if (count === threshold + 1) { // Only show once
      alert(
        `⚠️ Eroare tehnică detectată\n\n` +
        `Pagina are o problemă și se reîncarcă continuu.\n` +
        `Vei fi redirecționat la Dashboard.\n\n` +
        `Te rugăm să ștergi cache-ul browserului:\n` +
        `Chrome: Ctrl+Shift+Del (Windows) sau Cmd+Shift+Del (Mac)\n` +
        `Safari: Cmd+Option+E (Mac)`
      );

      // Redirect to dashboard after alert
      setTimeout(() => {
        window.location.href = '/planner/dashboard';
      }, 1000);
    }
  }

  // Debug logging in development
  if (import.meta.env.DEV && count % 10 === 0) {
    console.warn(`⚠️ ${componentName} rendered ${count} times`);
  }
}

// Clear all counters (useful for cleanup)
export function clearLoopDetection(): void {
  renderCounts.clear();
  resetTimers.forEach(timer => clearTimeout(timer));
  resetTimers.clear();
}
