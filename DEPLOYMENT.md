# Deploying Per-Set Logging Updates

This guide covers what to update in **Supabase**, **Render**, and **GitHub** after pulling the per-set logging changes.

---

## Order of operations

1. Push code to GitHub
2. Run SQL migrations in Supabase (schema first, then program seed)
3. Wait for Render to redeploy the backend (auto-deploy if enabled)
4. Deploy the frontend to GitHub Pages
5. Hard-refresh the live site and verify

---

## 1. Supabase (required)

Open your project at [supabase.com](https://supabase.com) → **SQL Editor**.

### Step A — Schema migration

Paste and run the full contents of:

`supabase/migrations/0003_per_set_logging.sql`

This adds:
- `logging_mode` and `variant_options` columns on `program_exercises`
- `variant_key` on `exercise_logs`
- `exercise_set_logs` table for per-set weight/reps/assisted-band data
- Migrates any existing flat logs into single set rows

### Step B — Program seed (updated exercises)

Paste and run the full contents of:

`supabase/migrations/0002_seed_program.sql`

This refreshes program exercises with the new logging modes (bodyweight pull-ups, variant lat pulldown exercise, etc.).

> Your logged workouts and `app_settings` (including `start_date = 2026-06-08`) are **not** deleted by the seed.

### Step C — Verify

```sql
select name, logging_mode from program_exercises where logging_mode != 'weighted_sets';
select count(*) from exercise_set_logs;
```

You should see Pull-ups as `bodyweight_sets`, Lat Pulldown as `variant`, and set rows for any previously logged exercises.

---

## 2. Render (backend API)

### What changes

- Backend code in `backend/` handles nested `sets[]` on session create/read
- `getStats()` filters progress to sessions on/after `start_date`
- Streak still counts all sessions

### What you need to do

| Action | Required? |
|--------|-----------|
| Push to GitHub (triggers auto-deploy) | Yes |
| New env vars | **No** — keep existing `DATABASE_URL`, `API_KEY`, `CORS_ORIGIN` |
| Manual redeploy | Only if auto-deploy is disabled |

### Verify after deploy

1. `GET https://workout2026-api.onrender.com/health` → `{"status":"ok"}`
2. Open the live app → log a workout with multiple sets → confirm it saves
3. Before June 8: progress should show **0/40** and label **"Starts June 8"**

---

## 3. GitHub / GitHub Pages (frontend)

### Option A — GitHub Actions (recommended)

If **Settings → Pages → Source** is **GitHub Actions**:

1. Push to `main` (changes under `frontend/` trigger the workflow)
2. Confirm the **Actions** tab shows a successful deploy
3. Secrets must still be set: `VITE_API_BASE_URL`, `VITE_API_KEY`

### Option B — Manual deploy

```bash
cd frontend
npm run deploy
```

### After deploy

Hard-refresh: `Ctrl+Shift+R` on `https://loganbh0.github.io/Workout2026Program/`

---

## Environment variables (unchanged)

| Service | Variables |
|---------|-----------|
| **Render** | `DATABASE_URL`, `API_KEY`, `CORS_ORIGIN` |
| **GitHub Actions secrets** | `VITE_API_BASE_URL`, `VITE_API_KEY` |
| **Supabase** | No new keys — same Postgres connection |

---

## Quick smoke checklist

- [ ] Squat shows 3 set rows (weight + reps each) when exercise card is expanded
- [ ] Exercise cards are collapsed by default; tap header to expand sets
- [ ] Pull-ups show reps per set + Band checkbox (no weight)
- [ ] Lat Pulldown exercise has variant toggle (Lat Pulldown vs Assisted Pull-ups)
- [ ] Session detail shows per-set breakdown
- [ ] Progress bar shows 0/40 before June 8; streak still updates
- [ ] After June 8, logged workouts count toward 1/40, 2/40, etc.
- [ ] Progress tab excludes movement exercises (A-skips, Box jumps, etc.)
- [ ] Pull-ups appear in Progress with Reps + Effort charts only (no Weight chart)

---

## Latest update: Progress filter + collapsible cards

| Service | Required? | What to do |
|---------|-----------|------------|
| **Supabase** | No | No new SQL |
| **Render** | Yes | Push backend — redeploys `/exercises` filter + progress guard |
| **GitHub Pages** | Yes | Push frontend or `npm run deploy` — accordion cards + Progress chart logic |

No new environment variables.
