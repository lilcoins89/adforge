import { NextRequest, NextResponse } from "next/server";
import { selectAd } from "@/lib/delivery";

export async function GET(req: NextRequest) {
  const zoneId = req.nextUrl.searchParams.get("zone");
  if (!zoneId) {
    return NextResponse.json({ error: "zone required" }, { status: 400 });
  }

  const result = await selectAd({
    zoneId,
    ip: req.headers.get("x-forwarded-for") || undefined,
    userAgent: req.headers.get("user-agent") || undefined,
    url: req.headers.get("referer") || undefined,
  });

  // Support both JSON and JS tag modes
  const format = req.nextUrl.searchParams.get("format") || "json";
  if (format === "js") {
    const js = `
(function(){
  var d=document,s=d.currentScript,w=${result.width},h=${result.height};
  var c=d.createElement('div');
  c.style.width=w+'px';c.style.height=h+'px';c.style.overflow='hidden';
  c.innerHTML=${JSON.stringify(result.html)};
  if(s&&s.parentNode)s.parentNode.insertBefore(c,s);
})();
`;
    return new NextResponse(js, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(result);
}
