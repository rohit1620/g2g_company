# Sasta Holiday CRM — Backend

Express + PostgreSQL API for the CRM.

## 1. Install dependencies

```
cd backend
npm install
```

## 2. Set up the database

1. Open **pgAdmin 4**.
2. Create a new database, e.g. `sasta_holiday_crm`.
3. Open the **Query Tool** on that database.
4. Open `schema.sql` (in this folder), copy all of it, paste into the Query Tool, and run it (F5).
   - This creates all tables, triggers, and adds 4 starter employees + 3 starter vendors.

> Already had the database set up before the itinerary builder was added?
> Just run `migrations/001_add_itineraries.sql` instead of the full `schema.sql` —
> it only adds the two new tables (`itineraries`, `itinerary_days`).
>
> Already had the database set up before payment installments or the phase
> system were added? Run these in order, only the ones you haven't already applied:
> - `migrations/002_add_payment_installments.sql`
> - `migrations/003_add_phases_and_mandatory_notes.sql`

## 3. Configure environment variables

1. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
2. Open `.env` and fill in your real PostgreSQL password (`DB_PASSWORD`) and database name if different.
3. `CRM_USERNAME` / `CRM_PASSWORD` is the single shared login for your sales team — change these to whatever you want.
4. `JWT_SECRET` — change this to any random long string (used to sign login sessions).

## 4. Run the server

```
npm run dev
```

You should see:
```
Sasta Holiday CRM backend running on http://localhost:4000
```

Test it's working:
```
curl http://localhost:4000/api/health
```
Should return `{"status":"ok"}`.

## API overview

All routes except `/api/auth/login` and `/api/health` require a login token.

**Auth**
- `POST /api/auth/login` — `{ username, password }` → `{ token }`

**Employees** (`/api/employees`)
- `GET /` — list all
- `POST /` — `{ name }` — add new
- `PATCH /:id` — `{ is_active }` — activate/deactivate

**Vendors** (`/api/vendors`)
- Same shape as employees.

**Leads** (`/api/leads`)
- `GET /` — list (supports `?status=` and `?search=`)
- `GET /:id` — full detail incl. notes, status/assignment/trip-detail/phase history, booking
- `POST /` — create lead (only `customer_name`, `phone`, `email`, `created_by` required)
- `PATCH /:id/trip-details` — `{ ...fields, note, changed_by }` — note required; only allowed while `current_phase = 1`
- `PATCH /:id/status` — `{ new_status, note, changed_by }` — note required
- `PATCH /:id/assign` — `{ new_assigned_to, note, changed_by }` — note required
- `PATCH /:id/phase` — `{ new_phase, note, changed_by }` — note required; `new_phase` is `1` or `2`
- `POST /:id/notes` — `{ note_text, added_by }` — appends a general note (never edited/deleted)

**Bookings** (nested under leads)
- `POST /api/leads/:leadId/booking` — `{ total_amount, advance_paid }`
- `PATCH /api/leads/:leadId/booking` — update payment
- `GET /api/leads/:leadId/booking/invoice` — downloads a PDF invoice

**Itineraries** (nested under leads — a lead can have multiple draft itineraries)
- `GET /api/leads/:leadId/itineraries` — list all itineraries for a lead
- `GET /api/leads/:leadId/itineraries/:itineraryId` — full itinerary incl. days
- `POST /api/leads/:leadId/itineraries` — `{ title, created_by, days?: [...] }` — create new
- `PATCH /api/leads/:leadId/itineraries/:itineraryId` — `{ title }` — rename
- `DELETE /api/leads/:leadId/itineraries/:itineraryId` — delete a draft itinerary
- `PUT /api/leads/:leadId/itineraries/:itineraryId/days` — `{ days: [...] }` — replace all days
- `GET /api/leads/:leadId/itineraries/:itineraryId/pdf` — downloads a day-by-day PDF

Each day object: `{ day_number, day_date, location, activities, breakfast, lunch, dinner, hotel_stay, notes }`

**Dashboard**
- `GET /api/dashboard` — total leads, conversion rate, revenue, status breakdown, recent leads

## How requests should be authenticated

After logging in, send the token on every request:
```
Authorization: Bearer <token>
```
The frontend will store this token (e.g. in memory or a cookie) after login and attach it automatically.

## Notes on design decisions

- **No delete** — leads are never deleted, only their status changes (e.g. to Cancelled/Lost). This matches the requirement to keep a full history. **Itineraries are the one exception** — since they're draft proposals (not financial records), they can be deleted if an agent creates one by mistake.
- **Shared login** — there's only one username/password for the whole team. Every action that should be attributed to a person (creating a lead, changing status, reassigning, adding a note) takes a `changed_by` / `added_by` / `created_by` field where the employee picks their own name from a dropdown.
- **History is automatic** — status changes and reassignments are logged inside the same database transaction as the update, so the history can never get out of sync with the current state.
- **Phases (Phase 1 / Phase 2)** — every lead has a `current_phase` (1 = Lead Generation, 2 = Vendor & Itinerary). All data is always visible regardless of phase — phases don't hide anything. What they control is **editing**: trip details can only be edited while `current_phase = 1` (enforced both in the UI and in the API itself, so a direct API call can't bypass it). Moving between phases is always manual (a "Move to Phase 2" / "Back to Phase 1" button) and requires a note, logged in `lead_phase_history`.
- **Mandatory notes** — status changes, reassignments, trip-detail edits, and phase moves all require a note explaining the change. These notes are stored directly on their respective history rows (`lead_status_history.note`, `lead_assignment_history.note`, `lead_trip_detail_history.note`, `lead_phase_history.note`) rather than in the general `lead_notes` log, so each note stays tied to the specific change it explains.
