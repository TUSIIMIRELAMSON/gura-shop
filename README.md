# GURA · McLAM Online Shops

A working responsive shop with an **empty product catalog**. The same app supports desktop, tablet, and mobile browsers. It includes an installable web-app manifest; this is a web app, not a packaged Android APK or iOS application.

## Run on your Windows computer

Install Node.js **22.13 or newer**. Open PowerShell in this extracted project folder (the folder containing `package.json`), then run:

```powershell
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm setup:local
pnpm dev
```

Open the local address printed in PowerShell, normally `http://localhost:5173`.

1. Click **Set up shop owner** at the bottom of the page.
2. Enter the **local owner setup code** printed by `pnpm setup:local` (also stored in `.dev.vars`).
3. Choose your name, email, and owner password of at least **10 characters**.
4. Open **Manage shop → Shop settings**. Set the currency before adding any products; UGX is the initial currency. Set the delivery fee if needed.
5. Open **Products → Add product**. Enter the name, category, optional brand/description, price, selling unit (such as kg, piece, bottle, or pack), and stock quantity.
6. Select all your product photos. Turn on **Publish in the shop** and save.
7. Open **View shop** to see the product and swipe through its photos.

Next time, run `pnpm dev` from the same folder. Stop the server with Ctrl+C. Re-run `pnpm setup:local` after installing a future version with new database migrations; previously applied migrations are tracked by Wrangler. Setup does not reset your shop.

Customer accounts are created from **Sign in → Create an account**. Their passwords require at least **6 characters**. Registration always creates a customer, never an owner. To test both roles on one computer, use a separate browser profile or private browser window for the customer.

If an owner page says only the shop owner can save, the page may be showing an older login while another tab has changed the shared browser session. Sign in again using the email chosen during owner setup. This version rechecks the session on tab focus, visibility changes, and login changes in other tabs; it shows the owner email and rejects requests from stale account views. A session change clears the previous account's open screens, including unsaved forms. Keep owner and customer testing in separate browser profiles or a private window.

For an existing local installation, follow `UPDATE-OWNER-LOGIN.txt` to install this fix while preserving your accounts and uploaded photos.

The **hosted shop and your local shop have separate databases, photos, owner accounts, and setup codes**. Changes in one do not synchronize into the other.

## What works

- Exactly five mobile tabs: **Home, Category, Search, Personal info, Cart**.
- Mixed product feed with progressive loading; product search and all 16 agreed categories.
- Dedicated Search tab with personal top brands ranked by paid order frequency and previously purchased products.
- Touch-swipe / mouse-drag / arrow product photo carousel, cover-photo selection, and enlarged photo viewing.
- Profile photo, one display name, masked account details, delivery details, password changes, region settings, notification preference, and customer account deletion.
- Gura Gold information controlled by the owner, and customer expressions of interest (not a paid membership).
- Swipeable recent orders, full order history, statuses, totals, delivery dates, Buy again, and Add to cart.
- Persistent customer cart and **pay-on-delivery checkout**.
- Owner product creation/editing, publishing/hiding, unlimited photo **count**, price/unit/stock control, customers, sales received, low-stock alerts, and order management.
- Salted password hashing, database-backed sessions, server-side authorization, CSRF origin checks, login attempt limits, transactional stock reservations, cancellation restocking, and idempotent checkout retries.

**No products, sample customers, orders, default owner account, or shared passwords are seeded.** Category labels are built-in navigation only. Images in the earlier design mockups are not included in the application catalog.

## Photos and stock

There is no application limit on the number of photos attached to a product. Files upload sequentially. Each image may be up to **20 MB**, using JPG, PNG, WebP, GIF, or AVIF. Hosting storage quotas still apply. Unsupported files show a clear error. Successful uploads remain saved if a later file fails; retry the failed files. Products stay hidden until the save-and-publish process completes successfully.

Units are named by the owner; quantities are whole numbers of that selling unit. To sell 500 g packets, use a unit such as `500 g pack`. A stock quantity of 20 means twenty such packets. Prices allow up to two decimal places.

Hiding a product removes it from browsing and prevents new purchases while retaining its records and order history. To remove it from sale, turn off **Publish in the shop**. The app does not physically delete historical product records.

## Payments, memberships, and notifications

This version accepts orders with **pay on delivery**. It does not collect card or mobile-money payments. The owner marks payment as received after collecting it. Sales and personal brand rankings count paid, non-cancelled orders.

Gura Gold is an information-and-interest workflow. Set the benefits and terms in Shop settings when ready. It does not charge a fee or issue paid membership access.

Order updates are visible in the app. A notification preference is saved; email, SMS, and device push delivery are not connected. English is the implemented interface language. Region selection saves the customer's region and does not convert store prices.

## Install as a mobile web app

Open the hosted shop in your phone browser and use the browser's **Add to Home Screen / Install app** option when available. The app requires a network connection; it does not cache private account pages or process orders offline. HTTPS is required for hosted installation. Localhost is suitable for desktop development.

## Data and backups

Local data and uploads are stored under `.wrangler/state`. Stop the app before backing up this folder. Preserve it and `.dev.vars` when moving your local project. Never commit `.dev.vars`, owner setup codes, or database files to Git.

Hosted deployments use the declared database `DB` and image bucket `BUCKET`; both are persistent and separate from browser storage. The one-time owner setup is protected by the server secret `OWNER_SETUP_KEY` and is closed after the first owner is created.

For a fresh hosted environment, configure a long random `OWNER_SETUP_KEY` secret before deployment. Never use a preset password. The private preview supplied with this project can initially be opened only by its owner; making it available to customers is a separate publishing/access step.

## Project map

- `app/shop.tsx`: customer interface and shared components.
- `app/admin.tsx`: owner dashboard, product editor, order management.
- `app/globals.css`: teal/white responsive visual design.
- `app/api/[...path]/route.ts`: application endpoints.
- `lib/server.ts`: database, sessions, passwords, validation, image storage.
- `lib/client-api.ts`: account-aware requests and session synchronization across tabs.
- `lib/catalog.ts`: categories, types, formatting helpers.
- `db/schema.ts`: database schema.
- `drizzle/`: versioned SQL migration, including atomic stock triggers.
- `scripts/local-setup.mjs`: local database setup and private setup-code generation.
- `tests/`: isolated API and SQLite transaction checks; test fixtures never enter the real shop.
- `public/`: web-app icons, manifest and network-only offline fallback.

## Development checks

```powershell
pnpm check
pnpm test
pnpm build
```

Tests call the actual request handlers with isolated SQLite and object-store adapters. They require no network or credentials and discard their data. They are not a substitute for testing a live payment provider or real devices.

To inspect and modify database structure, update `db/schema.ts`, generate a new migration with `pnpm db:generate`, inspect it, and apply it using setup. Do not rewrite migrations after they have been applied. The initial stock triggers are maintained SQL in the migration and must be preserved in future schema changes.
