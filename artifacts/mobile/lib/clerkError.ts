/** Plain-language message out of a Clerk API error object. */
export function clerkErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const errors = (error as { errors?: unknown }).errors;
    if (Array.isArray(errors) && errors.length > 0) {
      const first = errors[0] as { longMessage?: unknown; message?: unknown };
      if (typeof first.longMessage === "string" && first.longMessage) return first.longMessage;
      if (typeof first.message === "string" && first.message) return first.message;
    }
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "Something went wrong. Please try again.";
}
