/**
 * Ad delivery engine – selects the best creative for a zone
 * Inspired by Revive Adserver prioritization (Override > Contract > Remnant)
 */

import { prisma } from "./db";

export interface DeliveryRequest {
  zoneId: string;
  ip?: string;
  userAgent?: string;
  url?: string;
  country?: string;
}

export interface DeliveryResponse {
  creativeId: string | null;
  html: string;
  width: number;
  height: number;
  clickUrl?: string;
  impressionPixel?: string;
}

export async function selectAd(req: DeliveryRequest): Promise<DeliveryResponse> {
  const zone = await prisma.zone.findUnique({
    where: { id: req.zoneId },
    include: {
      campaigns: {
        include: {
          campaign: {
            include: {
              creatives: { where: { status: "ACTIVE" } },
            },
          },
        },
      },
    },
  });

  if (!zone || zone.status !== "ACTIVE") {
    return blank(zone?.width || 300, zone?.height || 250);
  }

  // Collect eligible active campaigns linked to this zone
  const now = new Date();
  const eligible = zone.campaigns
    .map((cz) => cz.campaign)
    .filter(
      (c) =>
        c.status === "ACTIVE" &&
        (!c.startDate || c.startDate <= now) &&
        (!c.endDate || c.endDate >= now) &&
        c.creatives.length > 0
    );

  if (eligible.length === 0) {
    return blank(zone.width, zone.height);
  }

  // Priority: OVERRIDE (priority high) → CONTRACT → REMNANT
  const sorted = eligible.sort((a, b) => {
    const typeScore = (t: string) =>
      t === "OVERRIDE" ? 3 : t === "CONTRACT" ? 2 : 1;
    const scoreA = typeScore(a.type) * 100 + a.priority;
    const scoreB = typeScore(b.type) * 100 + b.priority;
    return scoreB - scoreA;
  });

  // Weighted random among top priority group
  const topType = sorted[0].type;
  const topGroup = sorted.filter((c) => c.type === topType);
  const totalWeight = topGroup.reduce((s, c) => s + (c.weight || 1), 0);
  let r = Math.random() * totalWeight;
  let chosen = topGroup[0];
  for (const c of topGroup) {
    r -= c.weight || 1;
    if (r <= 0) {
      chosen = c;
      break;
    }
  }

  // Pick creative by weight
  const creatives = chosen.creatives;
  const cWeight = creatives.reduce((s, cr) => s + (cr.weight || 1), 0);
  let cr = Math.random() * cWeight;
  let creative = creatives[0];
  for (const c of creatives) {
    cr -= c.weight || 1;
    if (cr <= 0) {
      creative = c;
      break;
    }
  }

  // Record impression (async fire-and-forget style)
  recordImpression(chosen.id, zone.id, creative.id).catch(console.error);

  const clickUrl = `/api/delivery/click?cid=${creative.id}&zid=${zone.id}&url=${encodeURIComponent(creative.clickUrl || "")}`;

  let html = "";
  if (creative.type === "IMAGE" && creative.imageUrl) {
    html = `<a href="${clickUrl}" target="_blank" rel="noopener"><img src="${creative.imageUrl}" width="${zone.width}" height="${zone.height}" alt="${creative.name}" style="display:block;border:0;max-width:100%;height:auto;" /></a>`;
  } else if (creative.type === "HTML5" && creative.htmlContent) {
    html = creative.htmlContent;
  } else if (creative.type === "THIRD_PARTY" && creative.thirdPartyTag) {
    html = creative.thirdPartyTag;
  } else {
    html = `<div style="width:${zone.width}px;height:${zone.height}px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:12px;">AdForge</div>`;
  }

  return {
    creativeId: creative.id,
    html,
    width: zone.width,
    height: zone.height,
    clickUrl,
    impressionPixel: `/api/delivery/imp?cid=${creative.id}&zid=${zone.id}`,
  };
}

function blank(w: number, h: number): DeliveryResponse {
  return {
    creativeId: null,
    html: `<div style="width:${w}px;height:${h}px;background:transparent;"></div>`,
    width: w,
    height: h,
  };
}

async function recordImpression(campaignId: string, zoneId: string, creativeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.$transaction([
    prisma.creative.update({
      where: { id: creativeId },
      data: { impressions: { increment: 1 } },
    }),
    prisma.statDaily.upsert({
      where: {
        date_campaignId_zoneId: {
          date: today,
          campaignId,
          zoneId,
        },
      },
      create: {
        date: today,
        campaignId,
        zoneId,
        impressions: 1,
        requests: 1,
      },
      update: {
        impressions: { increment: 1 },
        requests: { increment: 1 },
      },
    }),
  ]);
}

export async function recordClick(creativeId: string, zoneId: string) {
  const creative = await prisma.creative.findUnique({
    where: { id: creativeId },
    include: { campaign: true },
  });
  if (!creative) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.$transaction([
    prisma.creative.update({
      where: { id: creativeId },
      data: { clicks: { increment: 1 } },
    }),
    prisma.statDaily.upsert({
      where: {
        date_campaignId_zoneId: {
          date: today,
          campaignId: creative.campaignId,
          zoneId,
        },
      },
      create: {
        date: today,
        campaignId: creative.campaignId,
        zoneId,
        clicks: 1,
      },
      update: {
        clicks: { increment: 1 },
      },
    }),
  ]);
}
