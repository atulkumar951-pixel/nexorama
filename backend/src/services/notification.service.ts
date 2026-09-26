import { prisma } from "../config/prisma";
import { emailTemplate, sendEmail } from "./email.service";
import type { NotificationType } from "@prisma/client";

interface NotifyInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  email?: { to: string; subject?: string; cta?: { label: string; url: string } };
}

/**
 * Create an in-app notification and optionally send a matching email.
 * Email failures never block the notification (PRD §44).
 */
export async function notifyUser(input: NotifyInput): Promise<void> {
  let emailSent = false;

  if (input.email?.to) {
    emailSent = await sendEmail({
      to: input.email.to,
      subject: input.email.subject ?? input.title,
      html: emailTemplate(input.title, `<p>${input.message}</p>`, input.email.cta),
      text: input.message,
    });
  }

  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        link: input.link,
        emailSent,
      },
    });
  } catch {
    // never let notification failures break business flows
  }
}
