# AdForge

**Modern low-cost ad server & multi-platform campaign manager**

Inspired by [Revive Adserver](https://github.com/revive-adserver/revive-adserver) (advertisers → campaigns → banners/creatives → websites → zones → stats) with first-class **Meta Ads** and **TikTok Ads** push, and a **5% platform fee** model.

## Features

| Area | What you get |
|------|--------------|
| **Inventory** | Websites, Zones (banner / interstitial / native / video), invocation JS tags |
| **Campaigns** | Contract (guaranteed), Remnant (fill), Override (priority) – classic Revive model |
| **Creatives** | Image, HTML5, Video, Native, Third-party tags |
| **Delivery** | Weighted selection, priority by campaign type, impression + click tracking |
| **Meta** | Create Campaign → Ad Set → Ad via Marketing API, pull insights |
| **TikTok** | Create Campaign → Ad Group via Business API v1.3 |
| **Analytics** | Daily rollups: requests, impressions, clicks, conversions, spend, revenue |
| **Pricing** | Only 5% platform fee on managed spend. Configurable CPM/CPC for own inventory |
| **Auth** | NextAuth credentials + roles (Admin / Advertiser / Publisher / Agency) |

## Quick start

```bash
git clone https://github.com/lilcoins89/adforge.git
cd adforge
cp .env.example .env
# edit .env – at minimum set NEXTAUTH_SECRET and DATABASE_URL

npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000

## Environment

See `.env.example`. Key variables:

- `DATABASE_URL` – SQLite by default (`file:./dev.db`). Switch to PostgreSQL for production.
- `NEXTAUTH_SECRET` – long random string
- Meta: `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`
- TikTok: `TIKTOK_ACCESS_TOKEN`, `TIKTOK_ADVERTISER_ID`

## Architecture

```
src/
  app/                  # Next.js App Router
    api/delivery/       # Ad serving endpoint + click tracker
    api/integrations/   # Meta & TikTok push endpoints (extend)
    dashboard/          # Full admin UI
  components/           # UI primitives + layout
  lib/
    delivery.ts         # Selection engine (Override > Contract > Remnant)
    meta.ts             # Meta Marketing API client
    tiktok.ts           # TikTok Marketing API client
    auth.ts / db.ts
prisma/schema.prisma    # Full data model
```

## Ad tag example

```html
<script src="https://your-domain.com/api/delivery?zone=ZONE_ID&format=js" async></script>
```

## Pushing to Meta / TikTok

1. Fill API credentials in `.env` or Integrations page.
2. Create a campaign in AdForge.
3. Click **Push to Meta** / **Push to TikTok** – objects are created in **PAUSED / DISABLED** state for review.
4. Activate from the native Ads Manager or via API.

See `src/lib/meta.ts` and `src/lib/tiktok.ts` for the full client methods.

## Production notes

- Replace SQLite with PostgreSQL.
- Put uploads on S3 / R2.
- Add rate limiting on `/api/delivery`.
- Use a system user + long-lived token for Meta.
- TikTok requires approved Marketing API app.
- Run behind CDN for ad tags.

## License

MIT – build on it freely.

---

Built as a strong, modern alternative that clones the best of Revive while adding native Meta & TikTok integration and a transparent cheap-rate model.
