/**
 * EmailJS integration utility for automated gift code delivery.
 * Supports both client-side (@emailjs/browser) and server-side REST API dispatch.
 */

export interface GiftCodeEmailPayload {
  toEmail: string;
  recipientName?: string;
  productName: string;
  giftCode: string;
  orderNumber: string;
  denomination?: number | string;
  notice?: string;
}

/**
 * Server-side EmailJS dispatch using the official EmailJS REST API.
 */
export async function sendGiftCodeEmailServer(payload: GiftCodeEmailPayload): Promise<{ success: boolean; error?: string }> {
  const serviceId = process.env.EMAILJS_SERVICE_ID || process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID || process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY || process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.log(
      `[EmailJS] Notice: EmailJS credentials not configured in environment variables. ` +
      `Simulated automatic email dispatch to ${payload.toEmail} for Order ${payload.orderNumber} (Code: ${payload.giftCode}).`
    );
    return { success: true };
  }

  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        ...(privateKey ? { accessToken: privateKey } : {}),
        template_params: {
          to_email: payload.toEmail,
          recipient_email: payload.toEmail,
          to_name: payload.recipientName || payload.toEmail.split("@")[0],
          product_name: payload.productName,
          gift_code: payload.giftCode,
          order_number: payload.orderNumber,
          denomination: payload.denomination ? `₹${payload.denomination}` : "",
          message: payload.notice || "Your digital gift voucher has been delivered.",
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[EmailJS REST API Error]:", errText);
      return { success: false, error: errText };
    }

    console.log(`[EmailJS] Successfully dispatched gift code email to ${payload.toEmail} for Order ${payload.orderNumber}`);
    return { success: true };
  } catch (err: any) {
    console.error("[EmailJS Exception]:", err);
    return { success: false, error: err.message };
  }
}
