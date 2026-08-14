# 📖 Sendora — Email Job Scheduler Run Guidebook

A complete handbook for setting up, running, testing, and monitoring the **Sendora Email Job Scheduler** system.

---

## 📑 Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Prerequisites & Dependencies](#2-prerequisites--dependencies)
3. [Infrastructure Setup (Postgres & Redis)](#3-infrastructure-setup-postgres--redis)
4. [Backend API & Worker Setup](#4-backend-api--worker-setup)
5. [Frontend Dashboard Setup](#5-frontend-dashboard-setup)
6. [Step-by-Step User Workflow](#6-step-by-step-user-workflow)
7. [Database & Redis Inspection Guide](#7-database--redis-inspection-guide)
8. [Failure Recovery & Restart Scenarios](#8-failure-recovery--restart-scenarios)
9. [Command Cheat Sheet](#9-command-cheat-sheet)

---

## 1. System Architecture Overview

```
┌──────────────────────────────┐
│  React + Vite Frontend       │ (Port 5173 — Ditto Sunlit Wildflower UI)
└──────────────┬───────────────┘
               │ HTTP / REST (JWT Auth)
               ▼
┌──────────────────────────────┐       ┌──────────────────────────────┐
│  Express API Server          ├──────►│  PostgreSQL (Port 5432)      │
│  (Port 3001)                 │       │  Source of Truth (Prisma)    │
└──────────────┬───────────────┘       └──────────────────────────────┘
               │ Enqueue Delayed Jobs
               ▼
┌──────────────────────────────┐
│  Redis (Port 6379)           │ (BullMQ Queue Store + Atomic Rate Limit Counters)
└──────────────┬───────────────┘
               │ Consume Delayed Jobs
               ▼
┌──────────────────────────────┐       ┌──────────────────────────────┐
│  BullMQ Email Worker Daemon  ├──────►│  Ethereal SMTP Server        │
│  (Concurrency: 5)            │       │  (Disposable Test Inboxes)   │
└──────────────────────────────┘       └──────────────────────────────┘
```

---

## 2. Prerequisites & Dependencies

Before starting, ensure you have:
- **Node.js**: `v20.x` or higher (`node -v`)
- **npm**: `v10.x` or higher (`npm -v`)
- **PostgreSQL**: `v14` to `v16` (running on `localhost:5432`)
- **Redis**: `v7.x` (running on `localhost:6379`)

---

## 3. Infrastructure Setup (Postgres & Redis)

### Option A: Using Docker Compose (Single Command)
From the repository root:
```bash
docker compose up -d
```
*Spins up Postgres on `5432` (`reachinbox_db`, user: `reachinbox`, pass: `reachinbox_pass`) and Redis on `6379`.*

### Option B: Using macOS Homebrew Services
```bash
brew services start postgresql@16
brew services start redis
```

---

## 4. Backend API & Worker Setup

Open **two separate terminal windows** for the backend.

###  Terminal 1: Express REST API Server
```bash
cd backend
npm install
npx prisma db push
npm run dev
```
- **Port**: `http://localhost:3001`
- **Health Check**: `curl http://localhost:3001/health` &rarr; `{"ok":true}`

### ⚡ Terminal 2: BullMQ Email Worker Daemon
```bash
cd backend
npm run worker
```
- **Logs**: Consumes BullMQ delayed jobs, checks rate limits, and sends emails via Ethereal SMTP.

---

## 5. Frontend Dashboard Setup

Open a **third terminal window** for the frontend.

### 🌐 Terminal 3: React 18 + Vite Dashboard
```bash
cd frontend
npm install
npm run dev
```
- **URL**: **`http://localhost:5173`**

---

## 6. Step-by-Step User Workflow

### Step 1: Sign in with Google
1. Open **`http://localhost:5173`** in your browser.
2. Click **"Continue with Google"** and authenticate.
3. The server automatically creates your user record in PostgreSQL and provisions a disposable SMTP mailbox on Ethereal Email.

### Step 2: Compose & Schedule a Campaign
1. Click **"+ Compose Email"** in the sidebar.
2. Fill in:
   - **Subject**: e.g., `Weekly Product Newsletter`
   - **Body**: e.g., `Hello! This is a test scheduled outreach campaign.`
   - **Upload CSV / TXT**: Select a CSV or TXT file containing recipient email addresses.
   - **Start Time**: Choose when the batch starts sending.
   - **Delay (seconds)**: Set delay spacing between recipients (e.g. `5`).
   - **Hourly Limit**: Set sender limit per hour (e.g. `200`).
3. Click **"Schedule Email"**.

### Step 3: Monitor Live Status
- **Dashboard**: Live counter cards (`Scheduled`, `Sent`, `Failed`) and 7-day activity graph.
- **Scheduled Emails**: View all queued jobs with exact scheduled dispatch timestamps.
- **Sent Emails**: View dispatched emails in real time (page polls every 6 seconds).

### Step 4: View Rendered Emails on Ethereal
When the worker sends an email, look at the **Worker Terminal**:
```
[INFO] Ethereal preview URL for sent email:
previewUrl: "https://ethereal.email/message/an41sIe.DCatJIUJan43kD9JACjb3QQoAAAAAf35vELjdOH06WTA2UprD-I"
to: "recipient@example.com"
```
Click the link to see the rendered HTML email in your browser.

---

## 7. Database & Redis Inspection Guide

### Option 1: TablePlus (Desktop App)
- **PostgreSQL Connection**:
  - URL: `postgres://reachinbox:reachinbox_pass@localhost:5432/reachinbox_db`
  - Tables: `User`, `Sender`, `EmailBatch`, `EmailJob`
- **Redis Connection**:
  - URL: `redis://localhost:6379`
  - Keys: `bull:email-queue:*` (Queue state) and `rate:<senderId>:<hour>` (Hourly limits)

### Option 2: Prisma Studio (Web GUI)
```bash
cd backend
npm run prisma:studio
```
*Opens interactive database browser on `http://localhost:5555`.*

### Option 3: Terminal CLI Commands
```bash
# Check Redis ping
redis-cli ping

# Check active Redis keys
redis-cli KEYS "*"

# Check EmailJob table in Postgres
psql "postgres://reachinbox:reachinbox_pass@localhost:5432/reachinbox_db" -c 'SELECT id, recipient, status, "scheduledAt", "sentAt" FROM "EmailJob";'
```

---

## 8. Failure Recovery & Restart Scenarios

### What happens if the API Server stops?
- Scheduled jobs are stored safely in Redis and PostgreSQL.
- The standalone BullMQ worker continues processing jobs uninterrupted.

### What happens if the Worker Daemon stops?
- When the worker is restarted (`npm run worker`), it automatically runs **Startup Reconciliation**:
  - Any jobs whose `scheduledAt` has passed are dispatched immediately.
  - Any future jobs remain safely delayed until their trigger time.
  - No jobs are duplicated (enforced by deterministic `jobId` and DB status guards).

### What happens if a Sender hits the Hourly Rate Limit?
- The job is **not dropped**.
- The system automatically updates `scheduledAt` to the next hour window and re-enqueues the job in BullMQ.

---

## 9. Command Cheat Sheet

| Task | Command | Directory |
|---|---|---|
| **Start Infrastructure** | `docker compose up -d` | `/` |
| **Start Backend API** | `npm run dev` | `/backend` |
| **Start Email Worker** | `npm run worker` | `/backend` |
| **Start Frontend UI** | `npm run dev` | `/frontend` |
| **Open DB Visualizer** | `npm run prisma:studio` | `/backend` |
| **Compile Frontend** | `npm run build` | `/frontend` |
| **Compile Backend** | `npm run build` | `/backend` |
| **Check Redis Health** | `redis-cli ping` | Any |
| **Check Postgres Health**| `pg_isready` | Any |
