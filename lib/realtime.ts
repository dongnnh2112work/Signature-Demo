export const REALTIME_DISCONNECT_STATUSES = [
  "CHANNEL_ERROR",
  "TIMED_OUT",
  "CLOSED",
] as const;

export type RealtimeStatus =
  | "SUBSCRIBED"
  | (typeof REALTIME_DISCONNECT_STATUSES)[number]
  | string;

/**
 * Refetch after a channel comes back. First SUBSCRIBED is not a reconnect
 * (caller should already subscribe first, then fetch).
 */
export function realtimeNeedsRefetch(
  status: RealtimeStatus,
  disconnected: boolean,
) {
  if (
    status === "CHANNEL_ERROR" ||
    status === "TIMED_OUT" ||
    status === "CLOSED"
  ) {
    return { disconnected: true, refetch: false };
  }
  if (status === "SUBSCRIBED" && disconnected) {
    return { disconnected: false, refetch: true };
  }
  return { disconnected, refetch: false };
}
