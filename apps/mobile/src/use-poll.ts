import { useEffect } from "react";
import { POLL_INTERVAL_MS } from "./api/client";

export function usePoll(tick: () => void, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;
    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, tick]);
}

export function formatClock(timestamp: number | null): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
