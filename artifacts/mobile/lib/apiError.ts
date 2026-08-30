/**
 * Helpers for reading errors thrown by the generated API client.
 * Errors carry `.status` and `.data` directly (no axios-style nesting);
 * the server's error payloads are plain-language `{ error: string }`.
 */

export function apiErrorStatus(err: unknown): number | null {
  if (err && typeof err === "object") {
    const status = (err as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return null;
}

/** The server's plain-language message when present, else a caller fallback. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    const data = (err as { data?: unknown }).data;
    if (data && typeof data === "object") {
      const message = (data as { error?: unknown }).error;
      if (typeof message === "string" && message.trim() !== "") return message;
    }
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim() !== "") return message;
  }
  return fallback;
}
