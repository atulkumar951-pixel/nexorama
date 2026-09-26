import { env } from "../config/env";
import { logger } from "../utils/logger";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Wrap content in a simple branded template. */
export function emailTemplate(title: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  const ctaHtml = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto"><tr><td style="background:#4f46e5;border-radius:8px">
         <a href="${cta.url}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px">${cta.label}</a>
       </td></tr></table>`
    : "";
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06)">
        <tr><td style="background:#4f46e5;padding:22px 32px">
          <span style="color:#ffffff;font-size:18px;font-weight:700">${env.appName}</span>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 16px;font-size:22px;color:#111827">${title}</h1>
          <div style="color:#374151;font-size:15px;line-height:1.6">${bodyHtml}</div>
          ${ctaHtml}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f9fafb;color:#6b7280;font-size:12px">
          If you did not request this email, you can safely ignore it.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendViaConsole(payload: EmailPayload): Promise<void> {
  logger.info(
    `📧 [email:console] to=${payload.to} subject="${payload.subject}"` +
      (payload.text ? `\n${payload.text}` : ""),
  );
}

async function sendViaResend(payload: EmailPayload): Promise<void> {
  const { Resend } = await import("resend");
  const resend = new Resend(env.email.apiKey);
  const result = await resend.emails.send({
    from: env.email.from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
  if (result.error) {
    throw new Error(`Email send failed: ${result.error.message}`);
  }
}

/** Dispatch an email using the configured driver. Never throws to callers. */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    switch (env.email.driver) {
      case "resend":
        await sendViaResend(payload);
        break;
      case "console":
      default:
        await sendViaConsole(payload);
    }
    return true;
  } catch (err) {
    logger.error(`Email dispatch failed (driver=${env.email.driver})`, err instanceof Error ? err.message : err);
    return false;
  }
}
