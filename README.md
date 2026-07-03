# MycoLab

A mobile-first mushroom cultivation lab manager for a solo operator. Built for
one-handed use at night during actual lab work: minimal taps per entry, sensible
defaults pre-filled from your last batch, no long typing required.

Tailored to a small tissue-culture lab (Auricularia sp. / Pleurotus sp., 100–300
fruiting bags per cycle). Metric units only.

## Features

1. **Batch tracker** — a filterable list of batches with a colored status dot.
   The center **+** (reachable from any screen) opens a fast new-batch flow:
   species / zone / sterilization as tap-to-select chips pre-filled with your
   last-used values, date defaulting to today, quantity stepper, and an
   auto-generated human-readable id (`AUR-0704-01` = species code · MMDD · daily
   sequence). Outcome defaults to `CLEAN`; tap a batch to expand it and update the
   outcome (e.g. clean → contaminated) days later.
2. **Media calculator** — enter a target volume (ml) and it computes PDA grams and
   MYCIPEN-MD mg from your stored ratios (default 39 g / 1000 ml and 150 mg/L).
   Quick-volume buttons (250 / 500 / 1000 / 2000). **Log prep** deducts the used
   PDA agar and MYCIPEN-MD from consumable stock.
3. **Contamination patterns** — overall contamination rate plus a breakdown by
   sterilization method, zone, and species (contaminated ÷ non-discarded batches),
   shown as bars. High-rate segments (≥ 25% with 3+ batches) are highlighted.
4. **Consumables tracker** — current stock with +/− steppers, editable low-stock
   threshold, and a LOW flag when stock ≤ threshold. Seeded with PDA agar (g),
   MYCIPEN-MD (mg), Parafilm (rolls), Isopropyl alcohol (L), Gloves (pairs).

All option lists (species + ID codes, sterilization methods, zones) and the base
ratios are editable in **Settings** — change your protocol without editing code.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS (dark, low-eye-strain theme)
- SQLite via Prisma — a local file DB in development, hosted **Turso** (libSQL)
  in production. Same code, selected automatically by environment.
- Server Actions for all reads/writes
- Zod for input validation

## Setup

Requires **Node.js 18.18+** (or 20+).

```bash
# 1. Install dependencies (also runs `prisma generate`)
npm install

# 2. Create the SQLite database and apply the schema
npx prisma migrate dev --name init

# 3. Seed base ratios, option lists, consumables, and a few example batches
npm run db:seed

# 4. Run the dev server
npm run dev
```

Open http://localhost:3000 (it redirects to `/batches`). On a phone on the same
network, open `http://<your-computer-ip>:3000`.

The database lives at `prisma/dev.db`. It is git-ignored and persists across
restarts. Re-running the seed will **not** overwrite your existing settings,
stock levels, or batches.

## Deploying to Vercel + Turso

Production runs the exact same code against a hosted **Turso** (libSQL) database
instead of the local file. The app auto-detects this: when `TURSO_DATABASE_URL`
is set it uses Turso; otherwise it uses `prisma/dev.db`. Local development is
unaffected — you never need Turso to work locally.

**A) Create the Turso database (one time).**

```bash
# Install the CLI and sign up (opens a browser)
# macOS/Linux: curl -sSfL https://get.tur.so/install.sh | bash
# Windows:     irm https://get.tur.so/install.ps1 | iex
turso auth signup

# Create the database
turso db create mycolab

# Push the schema (applies the committed migration SQL to Turso)
turso db shell mycolab < prisma/migrations/20260703191607_init/migration.sql

# Grab the two credentials you'll paste into Vercel
turso db show mycolab --url          # -> TURSO_DATABASE_URL (libsql://...)
turso db tokens create mycolab       # -> TURSO_AUTH_TOKEN
```

Then seed Turso once (run from the project root, substituting your values):

```bash
# macOS/Linux
TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npm run db:seed

# Windows PowerShell
$env:TURSO_DATABASE_URL="libsql://..."; $env:TURSO_AUTH_TOKEN="..."; npm run db:seed
```

**No-CLI alternative.** You can skip the Turso CLI entirely: create the database
from the Turso web dashboard ([app.turso.tech](https://app.turso.tech)), copy its
URL and create a token there, then apply the schema and seed from your machine
over the network:

```powershell
# Windows PowerShell (set both, then run the two commands)
$env:TURSO_DATABASE_URL="libsql://..."; $env:TURSO_AUTH_TOKEN="..."
npm run db:push:turso   # creates the tables in Turso from the migration SQL
npm run db:seed         # loads default settings, consumables, example batches
```

**B) Deploy on Vercel.**

1. Push this repo to GitHub (already done: `eZer413/mycolabjnac`).
2. On [vercel.com](https://vercel.com), **Add New → Project** and import the repo.
   Framework preset auto-detects as **Next.js**; leave the build command as the
   default (`npm run build`, which runs `prisma generate` first).
3. In **Settings → Environment Variables**, add for the **Production** (and
   Preview) environment:
   - `TURSO_DATABASE_URL` = your `libsql://...` URL
   - `TURSO_AUTH_TOKEN` = your token
   - `NEXT_TELEMETRY_DISABLED` = `1` (optional)
4. **Deploy.** Your app goes live at `https://<project-name>.vercel.app`
   (e.g. `mycolab.vercel.app` if the name is available). Open it on your phone —
   no domain needed.

Schema changes later: create the migration locally with `npm run db:migrate`,
commit it, then apply it to Turso with
`turso db shell mycolab < prisma/migrations/<new>/migration.sql` and redeploy.

## Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (`prisma generate` + `next build`) |
| `npm start` | Run the production build |
| `npm run db:migrate` | Create/apply a new migration (`prisma migrate dev`) |
| `npm run db:seed` | Seed defaults + example data |
| `npm run db:reset` | Drop the DB, re-apply migrations, and re-seed (**destroys data**) |

## Notes & conventions

- **Units are metric only** (g, mg, ml, L) — never imperial.
- **Batch id** format is `CODE-MMDD-NN`, where `NN` is the per-species daily
  sequence. Codes come from the editable species list in Settings.
- **A batch = one inoculation event** covering many bags/plates; `quantity`
  records how many. `pdaBatchRef` is a free-text label for the PDA media prep used.
- **Contamination rate** counts batches (a batch is clean or contaminated as a
  whole), excluding `DISCARDED` from the denominator.
- **Storage:** local `prisma/dev.db` in development (copy the file to back it up);
  hosted Turso in production, so you can reach the same data from any device via
  the deployed URL. See *Deploying to Vercel + Turso* above.

## Project structure

```
prisma/
  schema.prisma        # Batch, Consumable, Setting models
  seed.ts              # default ratios, options, consumables, sample batches
src/
  app/
    layout.tsx         # app shell: bottom nav + global "+" batch flow
    batches/           # feature 1
    media/             # feature 2
    patterns/          # feature 3
    supplies/          # feature 4
    settings/          # editable ratios + option lists
  components/          # client UI (chips, steppers, modal, bars, …)
  lib/
    db.ts              # Prisma client singleton
    actions.ts         # all Server Actions (create/update/log/step/settings)
    settings.ts        # settings read/write + species-code helper
    validation.ts      # Zod schemas
    patterns.ts        # contamination-rate computation
    defaults.ts        # seed defaults + outcome metadata
```
