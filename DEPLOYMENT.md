# Deploying Time/Distance Logging + Progress Calendar

This guide covers what to update after pulling bodyweight time/distance logging and the Progress tab workout calendar.

---

## Order of operations

1. Push code to GitHub
2. Run `0007_bodyweight_metrics.sql` in Supabase (and prior migrations if needed)
3. Wait for Render to redeploy the backend
4. Deploy the frontend to GitHub Pages
5. Hard-refresh and verify

---

## 1. Supabase (required)

Open your project at [supabase.com](https://supabase.com) → **SQL Editor**.

Run:

`supabase/migrations/0007_bodyweight_metrics.sql`

This adds:
- `duration_seconds` and `distance_yd` on `exercise_set_logs`
- `bodyweight_time_sets` and `bodyweight_distance_sets` logging modes on `program_exercises`

### Verify

```sql
select column_name from information_schema.columns
 where table_name = 'exercise_set_logs'
   and column_name in ('duration_seconds', 'distance_yd');
```

---

## 2. Render (backend API)

### What changes

- Set logs accept `durationSeconds` and `distanceYd` on create/update session
- `GET /activity/calendar?year=2026&month=6&scope=active|all` — workout dates for a month
- Progress series include `duration_seconds` and `distance_yd`
- Program create/edit accepts `bodyweight_time_sets` and `bodyweight_distance_sets`

Push to GitHub; no new env vars.

---

## 3. GitHub Pages (frontend)

### What changes

- Program builder / ad-hoc exercises: bodyweight reps, time, or distance per set
- Set rows: minutes + seconds (time) or yards (distance)
- Progress tab: monthly workout calendar above exercise charts
- Progress charts for time (`m:ss`) and distance (`yd`) exercises

Hard-refresh after deploy.

---

## Quick smoke checklist

- [ ] Create program exercise with **Bodyweight — time** → log sets with min/sec
- [ ] Create program exercise with **Bodyweight — distance** → log yards per set
- [ ] History session detail shows time/distance correctly
- [ ] Edit workout preserves time/distance values
- [ ] Progress calendar highlights days with any logged session
- [ ] Progress chart shows time or distance for those exercises

---

## Prior migrations

| File | Purpose |
|------|---------|
| `0004_programs.sql` | Multi-program |
| `0005_flexible_program_days.sql` | Custom splits |
| `0006_adhoc_sessions.sql` | One-off sessions |
| `0007_bodyweight_metrics.sql` | Time/distance sets (**this release**) |
