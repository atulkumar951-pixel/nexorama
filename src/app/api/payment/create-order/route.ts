import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const bridgeSecret = process.env.BRIDGE_SHARED_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay credentials not configured on Website 1 (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing)." },
        { status: 503 }
      );
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-bridge-signature") || "";

    // Verify HMAC signature if BRIDGE_SHARED_SECRET is configured
    if (bridgeSecret) {
      const expectedSignature = crypto
        .createHmac("sha256", bridgeSecret)
        .update(rawBody)
        .digest("hex");

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: "Invalid bridge HMAC signature." }, { status: 401 });
      }
    }

    const data = JSON.parse(rawBody);
    const {
      transactionId,
      amountPaise,
      amount,
      currency = "INR",
      referenceType,
      referenceId,
      userUid,
      customer = {},
      purpose = "Order Payment",
      callbackUrl = "",
    } = data;

    if (!transactionId || !amountPaise || amountPaise <= 0) {
      return NextResponse.json({ error: "Invalid payment parameters." }, { status: 400 });
    }

    // Call Razorpay API to create live order
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
    const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: Math.round(amountPaise),
        currency: currency,
        receipt: String(transactionId).substring(0, 40),
        notes: {
          transactionId: String(transactionId),
          referenceType: String(referenceType || ""),
          referenceId: String(referenceId || ""),
          userUid: String(userUid || ""),
          callbackUrl: String(callbackUrl || ""),
          source: "bridge_website2",
        },
      }),
    });

    if (!rzpResponse.ok) {
      const errData = await rzpResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: "Razorpay order creation failed.",
          details: errData.error ? errData.error.description : "Failed to create order",
        },
        { status: 502 }
      );
    }

    const rzpOrder = await rzpResponse.json();

    // Create checkout token for hosted checkout page
    const checkoutToken = Buffer.from(
      JSON.stringify({
        transactionId,
        razorpayOrderId: rzpOrder.id,
        keyId,
        amountPaise: Math.round(amountPaise),
        amount: amount || amountPaise / 100,
        currency,
        purpose,
        customer,
        callbackUrl,
      })
    ).toString("base64url");

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "nexoramart.vercel.app";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${proto}://${host}`;

    return NextResponse.json({
      success: true,
      transactionId,
      razorpayOrderId: rzpOrder.id,
      keyId,
      amountPaise: Math.round(amountPaise),
      amount: amount || amountPaise / 100,
      currency,
      purpose,
      customer,
      checkoutUrl: `${baseUrl}/pay/bridge?token=${checkoutToken}`,
      bridgeCheckoutUrl: `${baseUrl}/pay/bridge?token=${checkoutToken}`,
    });
  } catch (err: any) {
    console.error("[Bridge Create Order Error]:", err);
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
  }
}
