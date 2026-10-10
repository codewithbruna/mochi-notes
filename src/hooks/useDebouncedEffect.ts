import { useEffect } from "react";

export function useDebouncedEffect(effect: () => void, deps: unknown[], delay = 500) {
  useEffect(() => {
    const timeout = window.setTimeout(effect, delay);
    return () => window.clearTimeout(timeout);
  }, deps);
}
