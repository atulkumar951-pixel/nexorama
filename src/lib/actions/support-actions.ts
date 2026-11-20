"use server";

import { db } from "@/db";
import { supportTickets, notifications, auditLogs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface SupportFormState {
  success?: boolean;
  error?: string;
  ticketNo?: string;
  message?: string;
}

export async function submitSupportTicketAction(
  prevState: SupportFormState,
  formData: FormData
): Promise<SupportFormState> {
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || formData.get("no") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const category = String(formData.get("category") || "").trim();
  const problem = String(formData.get("problem") || "").trim();

  if (!name) {
    return { error: "Please enter your full name." };
  }
  if (!phone || phone.length < 7) {
    return { error: "Please enter a valid mobile / contact number." };
  }
  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }
  if (!category) {
    return { error: "Please select a problem category." };
  }
  if (!problem || problem.length < 5) {
    return { error: "Please describe your problem in detail (at least 5 characters)." };
  }

  try {
    const user = await getCurrentUser();
    const userId = user ? user.id : null;

    // Generate unique human-readable ticket number (TKT-YYYYMMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const ticketNo = `TKT-${dateStr}-${randomHex}`;

    // 1. Insert support ticket
    await db.insert(supportTickets).values({
      ticketNo,
      userId,
      name,
      phone,
      email,
      category,
      problem,
      status: "OPEN",
      resolutionTimeframe: "24-72 hours",
    });

    // 2. If logged in, generate an in-app user notification
    if (userId) {
      await db.insert(notifications).values({
        userId,
        title: `Support Ticket Logged: ${ticketNo}`,
        message: `Your issue regarding "${category}" has been received. Our operations team is on it, and your problem will be solved within 24–72 hours.`,
        type: "INFO",
      });
    }

    // 3. Log audit entry
    await db.insert(auditLogs).values({
      actorId: userId,
      actorEmail: email,
      action: "SUPPORT_TICKET_SUBMITTED",
      targetType: "SUPPORT_TICKET",
      targetId: ticketNo,
      detail: JSON.stringify({ name, phone, email, category, problemPreview: problem.slice(0, 100) }),
    });

    revalidatePath("/contact");
    revalidatePath("/notifications");

    return {
      success: true,
      ticketNo,
      message: "Your problem has been submitted successfully. Our operations team will solve your problem within 24–72 hours.",
    };
  } catch (err: any) {
    console.error("submitSupportTicketAction error:", err);
    return {
      error: "Unable to submit your support ticket right now. Please try again or email us directly.",
    };
  }
}
