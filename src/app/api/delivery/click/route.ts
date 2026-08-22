import { NextRequest, NextResponse } from "next/server";
import { recordClick } from "@/lib/delivery";

export async function GET(req: NextRequest) {
  const cid = req.nextUrl.searchParams.get("cid");
  const zid = req.nextUrl.searchParams.get("zid");
  const url = req.nextUrl.searchParams.get("url") || "/";

  if (cid && zid) {
    await recordClick(cid, zid).catch(console.error);
  }

  return NextResponse.redirect(url, 302);
}
