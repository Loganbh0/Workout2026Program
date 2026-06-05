# Deploying Home, Day-Complete, and Program Scoping

This guide covers what to update in **Supabase**, **Render**, and **GitHub** after pulling the multi-program and UI changes.

---

## Order of operations

1. Push code to GitHub
2. Run `0004_programs.sql` in Supabase
3. Wait for Render to redeploy the backend (auto-deploy if enabled)
4. Deploy the frontend to GitHub Pages
5. Hard-refresh the live site and verify

---

## 1. Supabase (required)

Open your project at [supabase.com](https://supabase.com) → **SQL Editor**.

### Run migration

Paste and run the full contents of:

`supabase/migrations/0004_programs.sql`

This adds:
- `programs` table with `display_name`, `slug`, `start_date`, `is_active`, etc.
- `program_id` on `program_days` and `workout_sessions`
- Seeds the existing 8-week program as the active program and links all existing data

> Your logged workouts are **not** deleted. `app_settings` is kept for global prefs; `start_date` moves to the active program row.

### Verify

```sql
select id, display_name, is_active, start_date from programs;
select count(*) from program_days where program_id is not null;
select count(*) from workout_sessions where program_id is not null;
```

You should see one active program (`pullups-2026` or similar) with `start_date = 2026-06-08`.

---

## 2. Render (backend API)

### What changes

- New routes: `GET/PUT /programs`, `POST /programs/:id/activate`
- `GET /today` includes `alreadyLogged`
- `GET /stats`, `/sessions`, `/exercises`, `/progress/exercise/:name` accept `?scope=active|all`
- Session create auto-attaches `program_id` from the active program

### What you need to do

| Action | Required? |
|--------|-----------|
| Push to GitHub (triggers auto-deploy) | Yes |
| New env vars | **No** — keep existing `DATABASE_URL`, `API_KEY`, `CORS_ORIGIN` |
| Manual redeploy | Only if auto-deploy is disabled |

### Verify after deploy

1. `GET https://workout2026-api.onrender.com/health` → `{"status":"ok"}`
2. `GET /api/v1/programs` (with `x-api-key`) → returns at least one program with `isActive: true`
3. Open the live app → Home tab shows program folder; Today shows day-complete after save

---

## 3. GitHub / GitHub Pages (frontend)

### What changes

- **Home** tab at `/` with folder grid
- **Today** moved to `/today`
- Program detail at `/programs/:id` (rename + ACTIVATE)
- Day-complete view on weekends, after save, and when already logged
- History/Progress scope toggle: **For active plan** | **All time**

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

- [ ] Home tab shows program folder(s); tap opens program detail
- [ ] Program detail lists 5 days; pencil renames; ACTIVE/ACTIVATE button works
- [ ] Today tab at `/today` shows workout form on unlogged weekdays
- [ ] After saving (or reload when already logged), Today shows breathing + stats (no form)
- [ ] Saturday/Sunday show rest day-complete view
- [ ] History and Progress have **For active plan** / **All time** toggle
- [ ] Scope toggle refetches data; active plan filters to current program
- [ ] Bottom nav: Home | Today | History | Progress (4 tabs)

---

## Prior migrations (if not yet applied)

| File | Purpose |
|------|---------|
| `0001_init.sql` | Base schema |
| `0002_seed_program.sql` | Program exercises |
| `0003_per_set_logging.sql` | Per-set logging |
| `0004_programs.sql` | Multi-program layer (**this release**) |
