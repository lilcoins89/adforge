/**
 * TikTok Marketing API client
 * Docs: https://business-api.tiktok.com/portal/docs
 *
 * Hierarchy: Advertiser → Campaign → Ad Group → Ad
 */

const BASE = "https://business-api.tiktok.com/open_api/v1.3";

export interface TikTokConfig {
  accessToken: string;
  advertiserId: string;
}

async function ttFetch(endpoint: string, token: string, body?: any, method = "GET") {
  const url = `${BASE}${endpoint}`;
  const opts: RequestInit = {
    method,
    headers: {
      "Access-Token": token,
      "Content-Type": "application/json",
    },
  };
  if (body && method !== "GET") {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`TikTok API [${data.code}]: ${data.message || JSON.stringify(data)}`);
  }
  return data.data;
}

export async function createTikTokCampaign(
  config: TikTokConfig,
  params: {
    campaign_name: string;
    objective_type: string;
    budget_mode?: string;
    budget?: number;
    operation_status?: "ENABLE" | "DISABLE";
  }
) {
  return ttFetch(
    "/campaign/create/",
    config.accessToken,
    {
      advertiser_id: config.advertiserId,
      campaign_name: params.campaign_name,
      objective_type: params.objective_type || "TRAFFIC",
      budget_mode: params.budget_mode || "BUDGET_MODE_DAY",
      budget: params.budget,
      operation_status: params.operation_status || "DISABLE",
    },
    "POST"
  );
}

export async function createTikTokAdGroup(
  config: TikTokConfig,
  params: {
    campaign_id: string;
    adgroup_name: string;
    budget?: number;
    schedule_type?: string;
    schedule_start_time?: string;
    schedule_end_time?: string;
    location_ids?: string[];
    gender?: string;
    age_groups?: string[];
    optimization_goal?: string;
    bid_type?: string;
    bid_price?: number;
    operation_status?: "ENABLE" | "DISABLE";
  }
) {
  return ttFetch(
    "/adgroup/create/",
    config.accessToken,
    {
      advertiser_id: config.advertiserId,
      campaign_id: params.campaign_id,
      adgroup_name: params.adgroup_name,
      budget: params.budget,
      schedule_type: params.schedule_type || "SCHEDULE_START_END",
      schedule_start_time: params.schedule_start_time,
      schedule_end_time: params.schedule_end_time,
      location_ids: params.location_ids || ["6252001"],
      gender: params.gender || "GENDER_UNLIMITED",
      age_groups: params.age_groups || ["AGE_18_24", "AGE_25_34"],
      optimization_goal: params.optimization_goal || "CLICK",
      bid_type: params.bid_type || "BID_TYPE_NO_BID",
      operation_status: params.operation_status || "DISABLE",
      placement_type: "PLACEMENT_TYPE_AUTOMATIC",
    },
    "POST"
  );
}

export async function getTikTokReports(
  config: TikTokConfig,
  params: {
    data_level: string;
    dimensions?: string[];
    metrics?: string[];
    start_date: string;
    end_date: string;
    filters?: any[];
  }
) {
  return ttFetch(
    "/report/integrated/get/",
    config.accessToken,
    {
      advertiser_id: config.advertiserId,
      report_type: "BASIC",
      data_level: params.data_level,
      dimensions: params.dimensions || ["campaign_id"],
      metrics: params.metrics || ["spend", "impressions", "clicks", "ctr", "cpc", "cpm"],
      start_date: params.start_date,
      end_date: params.end_date,
      page_size: 100,
    },
    "POST"
  );
}

export async function listTikTokCampaigns(config: TikTokConfig) {
  return ttFetch(
    "/campaign/get/",
    config.accessToken,
    {
      advertiser_id: config.advertiserId,
      page_size: 50,
    },
    "GET"
  );
}

/** High-level push – creates campaign in DISABLED state for review */
export async function pushCampaignToTikTok(
  config: TikTokConfig,
  campaign: {
    name: string;
    objective?: string;
    budgetDaily?: number;
    startDate?: Date | null;
    endDate?: Date | null;
  }
) {
  const result = await createTikTokCampaign(config, {
    campaign_name: campaign.name,
    objective_type: campaign.objective || "TRAFFIC",
    budget_mode: "BUDGET_MODE_DAY",
    budget: campaign.budgetDaily,
    operation_status: "DISABLE",
  });

  return {
    tiktokCampaignId: result.campaign_id,
    message: "Campaign created on TikTok (DISABLED). Create Ad Group + Ad next.",
  };
}
