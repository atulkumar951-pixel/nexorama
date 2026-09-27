import { NextResponse } from "next/server";
import { ensureDatabaseSchema } from "@/db/auto-migrate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await ensureDatabaseSchema();
    return NextResponse.json({
      ok: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Migration failed",
      },
      { status: 500 }
    );
  }
}
