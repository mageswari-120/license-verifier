# WDT License Verifier — Shopify App

A Shopify embedded app that verifies ThemeForest purchase codes for **buddhathemes** Shopify themes. Merchants install this app on their store, enter their purchase code, and get:

- ✅ Purchase code verification via Envato API
- ✅ Generated license key (WDT-XXXX-XXXX-XXXX-XXXX)
- ✅ Theme file downloads (latest version)
- ✅ Support access gated by support expiry

---

## Tech Stack

- **Remix** (Shopify App Remix framework)
- **Prisma** + **MySQL** (your Cloudways server)
- **Shopify Polaris** (UI components)
- **Envato API v3** (purchase code verification)

---

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd wdt-license-verifier
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
# From Shopify Partners Dashboard → Apps → Create App
SHOPIFY_API_KEY=xxx
SHOPIFY_API_SECRET=xxx

# Your app URL (ngrok for dev)
SHOPIFY_APP_URL=https://xxxx.ngrok.io

# Cloudways MySQL
DATABASE_URL="mysql://user:pass@host:3306/wdt_licenses"

# Envato Personal Token for buddhathemes
# build.envato.com → My Apps → New Personal Token
# Required scopes: "View and search Envato sites" + "View the user's purchases"
ENVATO_PERSONAL_TOKEN=xxx

# Your actual ThemeForest item IDs (comma-separated)
BUDDHATHEMES_ITEM_IDS=11111111,22222222

LICENSE_SECRET=some_long_random_string
SUPPORT_EMAIL=support@buddhathemes.com
SUPPORT_URL=https://buddhathemes.com/support
```

### 3. Database setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate dev --name init

# Seed theme catalog
npx prisma db seed
```

### 4. Get Envato Personal Token

1. Go to [build.envato.com](https://build.envato.com)
2. Sign in with your **buddhathemes** Envato account
3. Click **My Apps → Create a New Personal Token**
4. Name it "WDT License Verifier"
5. Enable these scopes:
   - ✅ View the user's Envato Account username
   - ✅ View and search Envato sites
   - ✅ View the user's purchases of the app creator's items ← **critical**
6. Copy the token to `.env`

### 5. Get ThemeForest Item IDs

For each of your buddhathemes Shopify themes on ThemeForest:
1. Go to the item page
2. The number in the URL is the item ID: `themeforest.net/item/lollipop/`**`12345678`**
3. Add all IDs to `BUDDHATHEMES_ITEM_IDS` in `.env`
4. Update `prisma/seed.ts` with real IDs + download URLs
5. Re-run `npx prisma db seed`

### 6. Dev server

```bash
# Terminal 1 — Shopify CLI
npm run dev
```

---

## Project Structure

```
wdt-license-verifier/
├── app/
│   ├── lib/
│   │   ├── envato.server.ts     ← Envato API verification
│   │   └── license.server.ts    ← DB operations, license key gen
│   ├── routes/
│   │   ├── app.tsx              ← Layout + Polaris AppProvider
│   │   ├── app._index.tsx       ← Dashboard (all licenses)
│   │   ├── app.verify.tsx       ← Purchase code entry + verify
│   │   ├── app.download.$licenseKey.tsx    ← Download page
│   │   ├── app.download-file.$licenseKey.tsx ← Secure file handler
│   │   ├── auth.$.tsx           ← Shopify auth
│   │   └── webhooks.tsx         ← APP_UNINSTALLED handler
│   ├── shopify.server.ts        ← Shopify app config
│   └── root.tsx
├── prisma/
│   ├── schema.prisma            ← DB schema (Session, License, Download, etc.)
│   └── seed.ts                  ← Theme catalog seed
├── shopify.app.toml
└── .env.example
```

---

## Key Flows

### Purchase Code Verification
```
Merchant enters code
→ Check if already registered to another store (DB)
→ Call Envato API: GET /v3/market/author/sale?code=xxx
→ Validate item.id is in BUDDHATHEMES_ITEM_IDS
→ Create License record in MySQL
→ Generate WDT-XXXX license key
→ Show success screen with license key + support status
```

### Download Flow
```
Merchant clicks Download
→ Validate license belongs to requesting shop (DB lookup)
→ Get download URL from ThemeItem table
→ Log Download event
→ Redirect to file URL
```

---

## Updating Theme Download URLs

When you release a new theme version:

1. Update `prisma/seed.ts` with new version + URL
2. Run `npx prisma db seed`

Or update directly in MySQL:
```sql
UPDATE ThemeItem 
SET version = '2.2.0', 
    downloadUrl = 'https://your-storage.com/lollipop-v2.2.0.zip',
    updatedAt = NOW()
WHERE id = 11111111;
```

---

## Deployment

1. Push to Railway or your Cloudways Node server
2. Set all `.env` vars in production
3. Run `npm run setup` (runs `prisma generate && prisma migrate deploy`)
4. Update `shopify.app.toml` with production URL
5. Run `shopify app deploy`
