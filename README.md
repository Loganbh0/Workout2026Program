# Workout 2026 Tracker

A minimal, iOS-style dark mobile web app for tracking the **8 Week Athletic Strength Program**. A **Home** tab lists your programs; **Today** shows the correct workout (Mon = Day 1 … Fri = Day 5) or a unified day-complete view on weekends and after logging. Log weights/reps per exercise with smart pre-fill, rate effort on a 1–5 scale, add notes, and review history and progress charts scoped to the active plan or all time.

- **Frontend:** React + Vite (static, deployed to GitHub Pages)
- **Backend:** Node + Express (deployed to Render)
- **Database:** Supabase Postgres

```
Frontend (GitHub Pages)  →  API (Render)  →  Postgres (Supabase)
        x-api-key                service role / connection string
```

---

## Repo layout

```
Workout2026Program/
  frontend/                 # Vite React app
  backend/                  # Express API
    data/program.json       # Source of truth for the program
    scripts/generate-seed.js
  supabase/migrations/      # SQL schema + program seed
  .github/workflows/        # GitHub Pages deploy
  render.yaml               # Render service definition
```

The program is **data-driven**. Exercises live in [`backend/data/program.json`](backend/data/program.json) and are seeded into Postgres — they are not hard-coded in React.

---

## 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migrations (in order) against your project. Either:
   - **SQL editor:** paste the contents of `supabase/migrations/0001_init.sql` through `0005_flexible_program_days.sql`, or
   - **Supabase CLI:**
     ```bash
     supabase link --project-ref <your-ref>
     supabase db push
     ```
3. Grab your connection string: **Project Settings → Database → Connection string → URI** (use the **pooler**, port `6543`). This is your `DATABASE_URL`.

> RLS is enabled on every table with no public policies, so the anon/public Data API cannot read or write. The API connects with the direct connection string and is the only way in.

### Set your program start date

So the app can show "Week X of 8", set a start date on the active program (replace the value):

```sql
update programs set start_date = '2026-01-05' where is_active = true;
```

---

## 2. Backend API (Render)

### Local dev

```bash
cd backend
cp .env.example .env      # fill in DATABASE_URL; API_KEY optional locally
npm install
npm run dev               # http://localhost:3000
```

Health check: `GET http://localhost:3000/health`

### Deploy to Render

1. Push this repo to GitHub.
2. In Render, **New → Blueprint** and point it at the repo (uses `render.yaml`), or create a **Web Service** with root dir `backend`, build `npm install`, start `npm start`.
3. Set environment variables:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Supabase pooler URI |
   | `API_KEY` | a long random string |
   | `CORS_ORIGIN` | `https://<your-username>.github.io` |
4. Deploy. Your API base will be `https://<service>.onrender.com/api/v1`.

---

## 3. Frontend (GitHub Pages)

### Local dev

```bash
cd frontend
cp .env.example .env      # set VITE_API_BASE_URL + VITE_API_KEY
npm install
npm run dev               # http://localhost:5173
```

### Deploy

`base` must match your repo name. If your repo is not `Workout2026Program`, set `VITE_BASE` accordingly.

**Option A — GitHub Actions (recommended):** the workflow in `.github/workflows/deploy-frontend.yml` builds and publishes on every push to `main`.

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Repo **Settings → Secrets and variables → Actions**:
   - Secrets: `VITE_API_BASE_URL`, `VITE_API_KEY`
   - Variable (optional): `VITE_BASE` (defaults to `/Workout2026Program/`)

**Option B — manual:**
```bash
cd frontend
npm run deploy            # builds and pushes dist/ to the gh-pages branch
```

---

## Environment variables summary

**Backend** (`backend/.env`)
| Key | Purpose |
|-----|---------|
| `DATABASE_URL` | Supabase Postgres connection string |
| `API_KEY` | Shared secret required on every API request |
| `CORS_ORIGIN` | Allowed browser origin(s), comma-separated |
| `PORT` | Local port (Render sets this automatically) |

**Frontend** (`frontend/.env`)
| Key | Purpose |
|-----|---------|
| `VITE_API_BASE_URL` | Render API base, incl. `/api/v1` |
| `VITE_API_KEY` | Must match backend `API_KEY` |
| `VITE_BASE` | GitHub Pages base path (repo name) |

> Security note: this is a single-user personal app. The API key is embedded in the public frontend build, so use a long random key and rely on Render rate limits. Never put the Supabase `service_role` key in the frontend.

---

## Editing the program

1. Edit [`backend/data/program.json`](backend/data/program.json).
2. Regenerate the seed: `cd backend && npm run generate-seed`.
3. Re-run `supabase/migrations/0002_seed_program.sql` against your database.

Program rows are replaced on reseed; your logged workouts are never touched.

---

## API reference

Base: `/api/v1` · all routes require header `x-api-key`.

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/programs` | List programs for Home (`id`, `displayName`, `dayCount`, `isActive`) |
| POST | `/programs` | Create program with days + exercises |
| GET | `/programs/:id` | Program detail + weekly days (includes `exercises[]` per day) |
| PUT | `/programs/:id` | Rename program (`displayName`) |
| POST | `/programs/:id/activate` | Set active program; body `{ startDate: "YYYY-MM-DD" }` required |
| GET | `/today?date=YYYY-MM-DD` | Resolve day from active program weekday schedule; includes `alreadyLogged` |
| GET | `/stats?scope=active\|all` | Streak, check-ins, completion %, current week |
| GET | `/settings` / PUT `/settings` | Global app settings |
| GET | `/program/day/:n` | Exercises + targets for a day (active program) |
| GET | `/prefill/day/:n` | Day exercises with last-logged weight/reps |
| GET | `/sessions?scope=active\|all` | History list (`?from=&to=&dayNumber=`) |
| GET | `/sessions/:id` | One session with exercise logs |
| POST | `/sessions` | Create a session + logs (auto-attaches active `program_id`) |
| GET | `/exercises?scope=active\|all` | Logged exercises (`{ name, loggingMode }[]`; excludes completion-only) |
| GET | `/progress/exercise/:name?scope=active\|all` | Time series for charts |
