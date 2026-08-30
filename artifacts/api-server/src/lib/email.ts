export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export type SendEmailFn = (msg: EmailMessage) => Promise<void>;

/**
 * The real transport. No email provider is connected yet, so this throws
 * loudly on purpose: callers treat a failed send as "not sent" (it consumes
 * no rate-limit budget and is logged as a warning), and the dashboard banner
 * remains the guaranteed in-app path. Once a provider (e.g. the Gmail
 * connector) is approved, this function is the single place to implement it.
 */
export const sendEmail: SendEmailFn = async () => {
  throw new Error(
    "No email provider is connected yet - the re-share heads-up email was not sent.",
  );
};
