# Sendora — Email Job Scheduler

A production-grade email scheduling service + dashboard, built for the
Email Job Scheduler platform. TypeScript/Express/BullMQ/Redis/Postgres

backend, React/Vite/Tailwind frontend, Ethereal Email for SMTP.

```
reachinbox-scheduler/
├── docker-compose.yml     # Postgres + Redis
├── backend/               # Express API + BullMQ worker
└── frontend/              # React dashboard
```

## 1. Prerequisites

- Node.js 20+
- Docker (for Postgres + Redis) — or your own local instances
- A Google OAuth 2.0 Web Client ID (already provided in `.env`)

## 2. Start infrastructure

```bash
docker compose up -d
```

This starts Postgres on `5432` and Redis on `6379` matching the `.env`
files already checked into `backend/.env` and `frontend/.env`.

## 3. Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init   # creates tables in Postgres
npm run dev                          # starts the Express API on :3001
```

In a **second terminal**, start the worker (it is a separate process on
purpose — see "Why two processes" below):

```bash
cd backend
npm run worker
```

Useful scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Express API with hot reload |
| `npm run worker` | BullMQ worker with hot reload |
| `npm run build` / `npm start` | Compile & run API in production |
| `npm run start:worker` | Run compiled worker in production |
| `npm run prisma:studio` | Browse the DB in a GUI |

## 4. Frontend

```bash
cd frontend
npm install
npm run dev     # starts on http://localhost:5173
```

Open `http://localhost:5173`, sign in with Google, and use the dashboard.

## 5. Ethereal Email setup

You don't need to do anything — leave `ETHEREAL_USER`/`ETHEREAL_PASS`
blank in `backend/.env` and the first time a user logs in, the backend
calls `nodemailer.createTestAccount()` to generate a **fresh disposable
Ethereal inbox** for that user's default sender, and stores the
credentials in the `Sender` table. Every sent email's Ethereal preview
URL is logged to the worker's console (`previewUrl` field) — open it to
see the rendered email.

If you'd rather pin a single shared Ethereal account (e.g. for a demo
video where you want everything in one inbox), create one at
https://ethereal.email and set `ETHEREAL_USER` / `ETHEREAL_PASS` before
first login.

## 6. Google OAuth setup

The frontend uses **Google Identity Services** (the modern
`<GoogleLogin>` button, not a redirect-based OAuth flow). It returns a
signed ID token directly to the browser, which we POST to
`/auth/google`. The backend verifies the token's signature and audience
server-side with `google-auth-library` using `GOOGLE_CLIENT_ID` — this
is the standard, secure pattern for SPA sign-in with Google and needs no
server-side redirect URI configuration beyond adding
`http://localhost:5173` to the OAuth client's **Authorized JavaScript
origins** in the Google Cloud Console.

`GOOGLE_CLIENT_SECRET` is included in the env for completeness but is
**not used** by this flow (ID-token verification only needs the client
ID); it would be needed if you later add a server-side authorization-code
flow.

---

## Architecture overview

```
Frontend (React)  ──REST/JSON──►  Express API  ──►  PostgreSQL (source of truth)
                                        │
                                        ▼
                                  BullMQ Queue (Redis)
                                        │
                                        ▼
                                  Email Worker  ──►  Ethereal SMTP
                                        │
                                        ▼
                              Redis rate-limit counters
```

### How scheduling works

1. `POST /api/emails/schedule` accepts `subject`, `body`, `recipients[]`,
   `startTime`, `delaySeconds`, `hourlyLimit`.
2. `schedulerService.scheduleEmailBatch` creates one `EmailBatch` row and
   one `EmailJob` row per recipient. Each job's `scheduledAt` is staggered:
   `startTime + i * delaySeconds` — this is what gives per-recipient
   spacing even before the worker ever runs.
3. For each `EmailJob`, we call `queue.add(..., { delay, jobId: emailJob.id })`.
   BullMQ stores this as a **delayed job in Redis** — no cron, no
   `setTimeout`, nothing in the Node process's memory. Redis itself
   (configured with `appendonly yes` in `docker-compose.yml`) is what
   makes the schedule durable.

### How persistence on restart is handled

- BullMQ's delayed jobs live entirely in Redis. If the **API server**
  restarts, nothing is lost — the jobs already sitting in Redis are
  untouched, and the worker (a separate process) keeps consuming them.
- If the **worker** restarts, BullMQ automatically resumes: any job whose
  delay has already elapsed is picked up immediately, and jobs still in
  the future stay delayed until their time arrives.
- The one gap this doesn't cover: a crash in the narrow window between
  writing an `EmailJob` row to Postgres and successfully calling
  `queue.add()` for it, or a crash mid-send that leaves a row stuck in
  `PROCESSING`. To close that gap, the worker runs a **startup
  reconciliation pass** (`reconcileUnfinishedJobs` in
  `queue/emailWorker.ts`): on boot, it re-`queue.add()`s every `EmailJob`
  still in `SCHEDULED` / `QUEUED` / `PROCESSING` state. Because we always
  use the `EmailJob.id` as the BullMQ `jobId`, this is a safe no-op for
  jobs that are already correctly queued — BullMQ does not create
  duplicates for a `jobId` it already knows about.
- **Idempotency** is enforced twice: at the queue level (dedup by
  `jobId`), and inside the worker itself, which re-reads the `EmailJob`
  row before sending and skips it if `status === "SENT"`.

### How rate limiting & concurrency are implemented

- **Concurrency**: `WORKER_CONCURRENCY` (env, default `5`) is passed
  straight into BullMQ's `Worker({ concurrency })` — that many jobs can
  be processed in parallel by one worker process.
- **Minimum delay between sends**: `MIN_DELAY_BETWEEN_SENDS_MS` (default
  `2000`ms) is enforced via BullMQ's built-in `limiter: { max: 1,
  duration: MIN_DELAY_BETWEEN_SENDS_MS }` on the worker, so the queue
  never releases more than one job per window regardless of concurrency.
  This is on top of the per-recipient stagger baked into `scheduledAt` at
  scheduling time (see above) — two independent layers, so the pacing
  holds even for jobs added directly via the API.
- **Emails per hour (per sender)**: implemented with **Redis**, not
  BullMQ and not an in-memory counter (`services/rateLimitService.ts`):
  - Key: `rate:{senderId}:{hourWindow}`, where `hourWindow = floor(unixSeconds / 3600)`.
  - `INCR` is atomic in Redis, so this is safe across multiple worker
    processes or multiple app instances hitting the same Redis — exactly
    the "safe across multiple workers/instances" requirement.
  - `EXPIRE key 3600` is set on the first increment in a window, so
    counters self-clean; there's no sweep/cleanup job needed.
  - Before sending, the worker calls `tryReserveSendSlot(senderId, hourlyLimit)`.
    If the count is already at the limit, the reservation is released and
    the job is **not sent** — instead its `EmailJob` row is updated back
    to `SCHEDULED` with `scheduledAt` pushed to the start of the next hour
    window, and a **new** BullMQ delayed job is enqueued for it. No job is
    ever dropped or permanently failed for hitting a rate limit; original
    relative order is preserved because jobs are always processed and,
    if necessary, re-queued in the order they originally came due.
- **Behavior under load (1000+ emails at once)**: since jobs are
  staggered by `delaySeconds` at scheduling time and further throttled by
  the worker's `limiter`, a burst of 1000 emails simply fills up the
  BullMQ delayed set; the worker drains it at the configured pace. If a
  sender's hourly cap is reached partway through, remaining jobs for that
  sender roll into subsequent hour windows automatically via the
  reschedule path above — this was verified logically rather than by
  actually sending 1000+ Ethereal emails (see assumptions below).

---

## Features implemented

**Backend**
- [x] Scheduler: BullMQ delayed jobs, no cron (`queue/emailQueue.ts`, `services/schedulerService.ts`)
- [x] Persistence across restarts + startup reconciliation (`queue/emailWorker.ts`)
- [x] Idempotency (deterministic `jobId` + DB status check before send)
- [x] Configurable worker concurrency (`WORKER_CONCURRENCY`)
- [x] Configurable min delay between sends (`MIN_DELAY_BETWEEN_SENDS_MS`, BullMQ limiter)
- [x] Configurable per-sender hourly rate limit, Redis-backed, multi-worker safe (`services/rateLimitService.ts`)
- [x] Reschedule-not-drop behavior when rate limit is hit
- [x] Multi-sender support (`Sender` model; every user gets a default Ethereal sender on first login)
- [x] Google OAuth login (ID-token verification, no mock)
- [x] REST API: `POST /api/emails/schedule`, `GET /api/emails/scheduled`, `GET /api/emails/sent`, `GET /api/emails/stats`, `GET /api/senders`, `POST /auth/google`, `GET /auth/me`

**Frontend**
- [x] Real Google login via `@react-oauth/google`, header shows name/email/avatar, logout
- [x] Dashboard: stat cards, scheduled-vs-sent overview chart, tabs for Scheduled/Sent
- [x] Compose modal: subject, body, CSV/TXT upload with client-side email extraction + count, start time, delay, hourly limit
- [x] Scheduled Emails table: email, subject, scheduled time, status, loading + empty states
- [x] Sent Emails table: email, subject, sent time, status (sent/failed), loading + empty states
- [x] Auto-refreshing dashboard (polls every 8s) so restart-recovery is visible without a manual refresh
- [x] TypeScript throughout, typed API responses/props, reusable components (`Sidebar`, `Header`, `StatCard`, tables, modal)

---

## Assumptions, shortcuts & trade-offs

- **No Figma access**: the assignment referenced a Figma link that
  wasn't reachable from this environment, so the dashboard layout was
  built to closely match the reference screenshots/mockups instead
  (sidebar nav, stat cards, overview chart, compose modal, scheduled/sent
  tables) rather than a pixel-exact Figma export.
- **Sender model**: rather than requiring manual SMTP setup, every user
  gets one auto-provisioned Ethereal sender on first login. Multi-sender
  support exists in the schema/API (`Sender` table, `senderId` on
  `EmailJob`) but the UI doesn't yet expose a "manage senders" screen —
  the compose flow uses the account's default sender.
- **CSV parsing is client-side**: the frontend extracts any
  RFC-5322-ish email addresses found anywhere in the uploaded file (so it
  tolerates a bare list, a `name,email` CSV, etc.) rather than requiring
  a strict single-column format.
- **Recipient de-duplication**: duplicate emails within one uploaded file
  are automatically de-duplicated before scheduling.
- **Not load-tested against real Ethereal limits**: the 1000+/rate-limit
  behavior is implemented and reasoned through above, but wasn't
  exercised against 1000 live Ethereal sends (Ethereal test accounts are
  rate-limited on Nodemailer's side too) — the demo video shows the logic
  with a smaller batch and a deliberately low `hourlyLimit` to trigger
  the reschedule path quickly.
- **JWT auth**, not sessions/cookies — simpler to reason about for a
  take-home, and avoids CORS/cookie SameSite complications between
  `localhost:5173` and `localhost:3001`.
- **No refresh-token rotation**: the app JWT is long-lived (`7d`) for
  demo convenience; a production version would add refresh tokens.

## Environment variables

See `backend/.env.example` and `frontend/.env.example`. Real values used
for this submission are already filled into `backend/.env` and
`frontend/.env` (not committed in a real repo — included here only
because they were provided for this take-home).

Note: the `FRONTEND_URL` value originally supplied
(`http://localhost:5173f`) had a stray trailing `f`; it's corrected to
`http://localhost:5173` in `backend/.env` so CORS works.
