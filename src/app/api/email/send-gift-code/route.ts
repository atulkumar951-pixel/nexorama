import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendGiftCodeEmailServer } from "@/lib/emailjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { toEmail, recipientName, productName, giftCode, orderNumber, denomination, notice } = body;

    if (!toEmail || !giftCode) {
      return NextResponse.json({ error: "Missing required email or code fields." }, { status: 400 });
    }

    const result = await sendGiftCodeEmailServer({
      toEmail,
      recipientName,
      productName: productName || "Gift Card Voucher",
      giftCode,
      orderNumber: orderNumber || "N/A",
      denomination,
      notice,
    });

    return NextResponse.json({ success: true, emailjs: result });
  } catch (err: any) {
    console.error("[send-gift-code API Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to send email." }, { status: 500 });
  }
}
