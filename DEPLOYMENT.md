# Deploying Workout Editing and Ad-Hoc Sessions

This guide covers what to update after pulling workout editing, program editing, UI trim, and one-off session features.

---

## Order of operations

1. Push code to GitHub
2. Run `0006_adhoc_sessions.sql` in Supabase (and prior migrations if needed)
3. Wait for Render to redeploy the backend
4. Deploy the frontend to GitHub Pages
5. Hard-refresh and verify

---

## 1. Supabase (required)

Open your project at [supabase.com](https://supabase.com) → **SQL Editor**.

Run:

`supabase/migrations/0006_adhoc_sessions.sql`

This adds:
- `session_type` (`program` | `adhoc`) and optional `title` on `workout_sessions`
- Nullable `day_number` for ad-hoc sessions
- Constraints so program sessions require a day number

### Verify

```sql
select session_type, title, day_number, workout_date from workout_sessions order by id desc limit 5;
```

---

## 2. Render (backend API)

### What changes

- `PUT /sessions/:id` — update logged workouts
- `POST /sessions` with `sessionType: "adhoc"` — one-off workouts
- `GET /today` returns `sessionId` + `session` when already logged
- `PUT /programs/:id` accepts full `days[]` for program editing
- Stats / `alreadyLogged` count **program** sessions only (adhoc excluded from completion)

Push to GitHub; no new env vars.

---

## 3. GitHub Pages (frontend)

### What changes

- Today: add/remove exercises before save; **Edit workout** after save
- **Log one-off workout** link → `/session/new`
- History session detail: **Edit workout**
- Program detail: **Edit plan** → `/programs/:id/edit`
- Removed streak/check-in/completion row; kept week progress bar only

Hard-refresh after deploy.

---

## Quick smoke checklist

- [ ] Today workout form: add/remove exercises, save
- [ ] After save: Edit workout → change sets → update
- [ ] Log one-off workout → appears in History, does not bump `X/40`
- [ ] History → session → Edit workout
- [ ] Program detail → Edit plan → change days/exercises → save
- [ ] Progress bar only (no streak/check-in row) on Today and day-complete

---

## Prior migrations

| File | Purpose |
|------|---------|
| `0004_programs.sql` | Multi-program |
| `0005_flexible_program_days.sql` | Custom splits |
| `0006_adhoc_sessions.sql` | One-off sessions (**this release**) |
