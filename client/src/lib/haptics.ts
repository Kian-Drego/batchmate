/** Tiny tactile confirmation on supporting (mostly Android) devices. */
export function tick(pattern: number | number[] = 8): void {
  try {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
