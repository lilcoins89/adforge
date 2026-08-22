/**
 * Meta Marketing API client (Facebook / Instagram Ads)
 * Docs: https://developers.facebook.com/docs/marketing-api
 *
 * Hierarchy: Ad Account → Campaign → Ad Set → Ad → Creative
 * We map AdForge Campaign → Meta Campaign + Ad Set
 *         AdForge Creative → Meta Ad Creative + Ad
 */

const GRAPH = "https://graph.facebook.com/v20.0";

export interface MetaConfig {
  accessToken: string;
  adAccountId: string; // without "act_"
}

async function metaFetch(path: string, token: string, options: RequestInit = {}) {
  const url = path.startsWith("http") ? path : `${GRAPH}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`Meta API: ${data.error.message || JSON.stringify(data.error)}`);
  }
  return data;
}

export async function createMetaCampaign(
  config: MetaConfig,
  params: {
    name: string;
    objective: string;
    status?: "ACTIVE" | "PAUSED";
    special_ad_categories?: string[];
  }
) {
  const accountId = config.adAccountId.replace(/^act_/, "");
  return metaFetch(`/act_${accountId}/campaigns`, config.accessToken, {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      objective: params.objective || "OUTCOME_TRAFFIC",
      status: params.status || "PAUSED",
      special_ad_categories: params.special_ad_categories || [],
      is_adset_budget_sharing_enabled: false,
    }),
  });
}

export async function createMetaAdSet(
  config: MetaConfig,
  params: {
    name: string;
    campaignId: string;
    dailyBudget?: number;
    lifetimeBudget?: number;
    startTime?: string;
    endTime?: string;
    targeting?: Record<string, any>;
    optimizationGoal?: string;
    billingEvent?: string;
    bidAmount?: number;
    status?: "ACTIVE" | "PAUSED";
  }
) {
  const accountId = config.adAccountId.replace(/^act_/, "");
  const body: any = {
    name: params.name,
    campaign_id: params.campaignId,
    status: params.status || "PAUSED",
    billing_event: params.billingEvent || "IMPRESSIONS",
    optimization_goal: params.optimizationGoal || "REACH",
    targeting: params.targeting || {
      geo_locations: { countries: ["US"] },
      age_min: 18,
      age_max: 65,
    },
  };
  if (params.dailyBudget) body.daily_budget = Math.round(params.dailyBudget * 100);
  if (params.lifetimeBudget) body.lifetime_budget = Math.round(params.lifetimeBudget * 100);
  if (params.startTime) body.start_time = params.startTime;
  if (params.endTime) body.end_time = params.endTime;
  if (params.bidAmount) body.bid_amount = Math.round(params.bidAmount * 100);

  return metaFetch(`/act_${accountId}/adsets`, config.accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createMetaAd(
  config: MetaConfig,
  params: {
    name: string;
    adsetId: string;
    creativeId: string;
    status?: "ACTIVE" | "PAUSED";
  }
) {
  const accountId = config.adAccountId.replace(/^act_/, "");
  return metaFetch(`/act_${accountId}/ads`, config.accessToken, {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      adset_id: params.adsetId,
      creative: { creative_id: params.creativeId },
      status: params.status || "PAUSED",
    }),
  });
}

export async function getMetaInsights(
  config: MetaConfig,
  objectId: string,
  datePreset = "last_7d"
) {
  return metaFetch(
    `/${objectId}/insights?fields=impressions,clicks,spend,cpc,cpm,ctr,actions&date_preset=${datePreset}`,
    config.accessToken
  );
}

export async function listMetaCampaigns(config: MetaConfig) {
  const accountId = config.adAccountId.replace(/^act_/, "");
  return metaFetch(
    `/act_${accountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget&limit=50`,
    config.accessToken
  );
}

/** High-level: push an AdForge campaign + its first creative to Meta (paused by default) */
export async function pushCampaignToMeta(
  config: MetaConfig,
  campaign: {
    name: string;
    objective?: string;
    budgetDaily?: number;
    startDate?: Date | null;
    endDate?: Date | null;
    targeting?: any;
  },
  creative?: { name: string; imageUrl?: string; clickUrl?: string }
) {
  const metaCampaign = await createMetaCampaign(config, {
    name: campaign.name,
    objective: campaign.objective || "OUTCOME_TRAFFIC",
    status: "PAUSED",
  });

  const adset = await createMetaAdSet(config, {
    name: `${campaign.name} – Ad Set`,
    campaignId: metaCampaign.id,
    dailyBudget: campaign.budgetDaily,
    startTime: campaign.startDate?.toISOString(),
    endTime: campaign.endDate?.toISOString(),
    targeting: campaign.targeting,
    status: "PAUSED",
  });

  return {
    metaCampaignId: metaCampaign.id,
    metaAdSetId: adset.id,
    message: "Campaign & Ad Set created on Meta (PAUSED). Upload creative next.",
  };
}
