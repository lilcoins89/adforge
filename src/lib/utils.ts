import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function calcCTR(impressions: number, clicks: number) {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
}

export function calcCPM(spend: number, impressions: number) {
  if (impressions === 0) return 0;
  return (spend / impressions) * 1000;
}

export function calcCPC(spend: number, clicks: number) {
  if (clicks === 0) return 0;
  return spend / clicks;
}
