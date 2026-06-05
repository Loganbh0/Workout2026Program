# Deploying Program Builder and Flexible Splits

This guide covers what to update in **Supabase**, **Render**, and **GitHub** after pulling the program builder, default Today route, and activate start-date changes.

---

## Order of operations

1. Push code to GitHub
2. Run migrations in Supabase (`0004` if needed, then `0005`)
3. Wait for Render to redeploy the backend
4. Deploy the frontend to GitHub Pages
5. Hard-refresh and verify

---

## 1. Supabase (required)

Open your project at [supabase.com](https://supabase.com) → **SQL Editor**.

### Migration A — Multi-program (if not yet applied)

`supabase/migrations/0004_programs.sql`

### Migration B — Flexible training days

`supabase/migrations/0005_flexible_program_days.sql`

This relaxes `day_number` limits and adds a unique `(program_id, weekday)` index so custom splits (e.g. Mon/Wed/Fri) work with the day trainer.

### Verify

```sql
select id, display_name, is_active, start_date, sessions_per_week from programs;
select program_id, weekday, day_number, title from program_days order by program_id, day_number;
```

---

## 2. Render (backend API)

### What changes

- `POST /programs` — create custom program with days + exercises
- `POST /programs/:id/activate` — requires `{ startDate: "YYYY-MM-DD" }`
- `GET /today` — resolves workout by active program's weekday schedule (not fixed Mon=1)
- `GET /programs/:id` — includes exercises per day

| Action | Required? |
|--------|-----------|
| Push to GitHub | Yes |
| New env vars | **No** |
| Manual redeploy | Only if auto-deploy is off |

### Verify

1. `GET /health` → `{"status":"ok"}`
2. `POST /programs` with a 3-day split → returns program with 3 days
3. Activate with start date → Today shows rest on off-days

---

## 3. GitHub Pages (frontend)

### What changes

- App opens to **Today** (`/`)
- **Home** at `/home` with **+** to create programs
- Program detail: accordion days, activate → start-date scroll wheel
- Create program wizard at `/programs/new`

Secrets unchanged: `VITE_API_BASE_URL`, `VITE_API_KEY`

Hard-refresh after deploy: `Ctrl+Shift+R`

---

## Quick smoke checklist

- [ ] App opens to Today tab by default
- [ ] Home **+** opens create program wizard
- [ ] Create Mon/Wed/Fri program with exercises → saves and opens detail
- [ ] Program detail day rows expand to show exercise table
- [ ] ACTIVATE opens date wheel; confirm sets start date
- [ ] On 3-day split, Tuesday shows rest/day-complete; Mon/Wed show workout
- [ ] History/Progress scope toggle still works

---

## Prior migrations

| File | Purpose |
|------|---------|
| `0001_init.sql` | Base schema |
| `0002_seed_program.sql` | Program exercises |
| `0003_per_set_logging.sql` | Per-set logging |
| `0004_programs.sql` | Multi-program layer |
| `0005_flexible_program_days.sql` | Custom splits (**this release**) |
