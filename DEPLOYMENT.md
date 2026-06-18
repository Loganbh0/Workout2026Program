# Deploying Deactivate + Progress Redesign

This guide covers program deactivation (resume/restart) and the redesigned Progress tab.

---

## Order of operations

1. Push code to GitHub
2. Wait for Render to redeploy the backend (no new SQL migration)
3. Deploy the frontend to GitHub Pages
4. Hard-refresh and verify

---

## 1. Supabase

**No migration required** for this release. Ensure prior migrations through `0007_bodyweight_metrics.sql` are already applied.

---

## 2. Render (backend API)

### What changes

- `POST /programs/:id/deactivate` — pause the active program
- `POST /programs/:id/activate` — `{ resume: true }` keeps `start_date`; `{ startDate }` restarts
- `GET /activity/day/:date?scope=active|all` — full sessions for a calendar day
- `GET /today` returns `{ mode: "no_program" }` when nothing is active (no 404)

Push to GitHub; no new env vars.

---

## 3. GitHub Pages (frontend)

### What changes

- Program detail: **Deactivate**, **Resume**, **Restart**
- Home folders: **Paused** badge on deactivated plans with a start date
- Today: empty state when no active program
- Progress tab: clickable calendar and inline day workout details

Hard-refresh after deploy.

---

## Quick smoke checklist

- [ ] Active program → Deactivate → Today shows “No active program”
- [ ] Paused program → Resume (same start date) → Today works again
- [ ] Paused program → Restart (new start date) → completion recalculates from new date
- [ ] Progress calendar: click workout day → session details + notes

---

## Prior migrations

| File | Purpose |
|------|---------|
| `0007_bodyweight_metrics.sql` | Time/distance sets (latest schema) |
