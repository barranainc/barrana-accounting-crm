# Barrana Accounting CRM

A secure client portal and internal workflow CRM for Barrana Accounting Services (barranaaccounting.ai). Built with Next.js 15 App Router, Prisma, PostgreSQL, and NextAuth v5.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Auth | NextAuth v5 beta (Credentials + JWT) |
| Database | PostgreSQL via Prisma ORM |
| Styling | Tailwind CSS + shadcn/ui (Radix UI) |
| Storage | Local filesystem (Phase 1) |
| Signatures | Mock provider (Phase 1) |
| Email | Console log adapter (Phase 1) |

---

## Local setup

### 1. Prerequisites

- Node.js 20+
- PostgreSQL running locally (or a connection string to a hosted DB)
- `tsx` (installed as a dev dependency)

### 2. Install dependencies

```bash
npm install
```

### 3. Environment variables

Copy the example and fill in values:

```bash
cp .env.example .env.local
```

Minimum required:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/barrana_crm"
NEXTAUTH_SECRET="change-me-to-a-random-32-char-string"
NEXTAUTH_URL="http://localhost:3000"
```

Optional (defaults shown):

```env
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=25
ALLOWED_MIME_TYPES=application/pdf,image/jpeg,image/png,...
SIGNATURE_PROVIDER=mock
EMAIL_PROVIDER=log
```

### 4. Set up the database

```bash
# Push schema to database (development)
npm run db:push

# Or use migrations (production)
npm run db:migrate
```

### 5. Seed demo data

```bash
npm run db:seed
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Render

### Step 1 — Create a PostgreSQL database

1. Log in to [render.com](https://render.com) → **New** → **PostgreSQL**
2. Set a name (e.g. `barrana-crm-db`), choose your region, pick a plan (Free for testing, Starter $7/mo for production)
3. Click **Create Database** and wait ~1 minute

Once provisioned, the database info page shows two URLs:

- **Internal Database URL** — used by the web service (free, stays within Render's network)
- **External Database URL** — used from your local machine to push the schema and seed data

### Step 2 — Push the schema from your local machine

Run this once using the **External** URL:

```bash
DATABASE_URL="<External Database URL>" npx prisma db push
```

### Step 3 — Seed demo data

```bash
DATABASE_URL="<External Database URL>" npm run db:seed
```

You should see all `✓` lines and the demo credentials printed at the end.

### Step 4 — Create the web service

1. **New** → **Web Service** → connect your GitHub repo
2. Configure:
   - **Runtime:** Node
   - **Build command:** `npm install && npm run build && npm run db:seed`
   - **Start command:** `npm start`
   - **Node version:** 20

### Step 5 — Set environment variables

In your web service → **Environment** tab, add:

| Key | Value |
|---|---|
| `DATABASE_URL` | **Internal** Database URL from Step 1 |
| `AUTH_SECRET` | Random 32+ char string — run `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-app-name.onrender.com` |
| `STORAGE_PROVIDER` | `local` |
| `LOCAL_STORAGE_PATH` | `/opt/render/project/src/uploads` |
| `EMAIL_PROVIDER` | `log` |
| `EMAIL_FROM` | `noreply@barranaaccounting.ai` |
| `SIGNATURE_PROVIDER` | `mock` |
| `MAX_FILE_SIZE_MB` | `25` |
| `ALLOWED_MIME_TYPES` | `application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.ms-excel` |

Click **Save Changes** → Render redeploys automatically.

> **File storage note:** Render's disk is ephemeral on free/starter plans — uploaded files are lost on each redeploy. For persistent uploads, swap `STORAGE_PROVIDER` to `s3` and add S3 credentials. Local storage is fine for demo and testing rounds.

---

## Demo credentials

Password for all accounts: **`Demo1234!`**

| Role | Email | Access |
|---|---|---|
| `SUPER_ADMIN` | admin@barranaaccounting.ai | Full access including settings and audit log |
| `CPA_ADMIN` | cpa@barranaaccounting.ai | Full staff access including audit log |
| `ASSISTANT` | assistant@barranaaccounting.ai | Staff access, no audit log or settings |
| `CLIENT_USER` | portal@techflow.ca | Portal only — linked to TechFlow Solutions |

---

## Route map

### Staff routes (`/`)

| Path | Description | Min role |
|---|---|---|
| `/dashboard` | Staff overview dashboard | ASSISTANT |
| `/clients` | Client list + search | ASSISTANT |
| `/clients/new` | Create client | ASSISTANT |
| `/clients/[id]` | Client detail (tabbed) | ASSISTANT |
| `/clients/[id]/edit` | Edit client | ASSISTANT |
| `/engagements/[id]` | Engagement detail | ASSISTANT |
| `/documents` | All documents | ASSISTANT |
| `/documents/requests` | Document requests | ASSISTANT |
| `/messages` | Message threads | ASSISTANT |
| `/notices` | Notices & letters | ASSISTANT |
| `/signatures` | Signature requests | ASSISTANT |
| `/tasks` | Task management | ASSISTANT |
| `/audit` | Audit log | CPA_ADMIN |
| `/settings` | System settings | SUPER_ADMIN |

### Portal routes (`/portal/`)

| Path | Description |
|---|---|
| `/portal/dashboard` | Client dashboard |
| `/portal/documents` | Client-visible documents |
| `/portal/requests` | Document requests from accountant |
| `/portal/messages` | Message threads (CLIENT_STAFF only) |
| `/portal/notices` | Notices & letters |
| `/portal/signatures` | Signature requests |

### API routes

| Path | Description |
|---|---|
| `/api/auth/[...nextauth]` | NextAuth handlers |
| `/api/files/[documentId]` | Authenticated file download/view |

---

## Role permissions

| Capability | SUPER_ADMIN | CPA_ADMIN | ASSISTANT | CLIENT_USER |
|---|:---:|:---:|:---:|:---:|
| View/manage all clients | ✓ | ✓ | ✓ | — |
| View/manage engagements | ✓ | ✓ | ✓ | — |
| Upload documents | ✓ | ✓ | ✓ | ✓ (portal) |
| View INTERNAL documents | ✓ | ✓ | ✓ | — |
| View audit log | ✓ | ✓ | — | — |
| System settings | ✓ | — | — | — |
| Portal access | — | — | — | ✓ |
| View internal messages | ✓ | ✓ | ✓ | — |

---

## Useful scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:push      # Push schema (dev, no migration history)
npm run db:migrate   # Run migrations (production)
npm run db:seed      # Seed demo data
npm run db:studio    # Open Prisma Studio
npm run db:reset     # Reset DB + re-seed (DESTRUCTIVE)
```

---

## Architecture notes

### Access control

Access is enforced at **two levels**: middleware (`middleware.ts`) blocks unauthenticated requests by path prefix, and each page/action calls `requireStaff()` / `requireAdmin()` / `requireClientUser()` server-side as a second gate.

### Document versioning

Documents use a self-rooting version chain. On first upload, `rootDocumentId` is set to the document's own ID in a single transaction. On version bump, `rootDocumentId` is copied from the previous version — keeping all versions queryable via the chain root.

### Messaging safety

`threadType` (on `MessageThread`) and `isInternal` (on `Message`) are separate filters applied at separate query levels. Client users always see `threadType: CLIENT_STAFF` threads and `isInternal: false` messages only.

### Storage abstraction

`StorageService` (`src/lib/storage/`) is swappable via `STORAGE_PROVIDER` env var. Phase 1 uses local disk. Phase 2: swap to S3/GCS without changing business logic.

### Signature abstraction

`SignatureProvider` (`src/lib/signatures/`) is swappable via `SIGNATURE_PROVIDER` env var. Phase 1 uses a mock that stores `viewUrl` and simulates the flow. Phase 2: drop in DocuSign or Dropbox Sign adapter.

---

## QA checklist

### Auth & access control
- [ ] Unauthenticated request to `/dashboard` redirects to `/login`
- [ ] CLIENT_USER accessing `/dashboard` redirects to `/portal/dashboard`
- [ ] ASSISTANT accessing `/audit` is blocked (403/redirect)
- [ ] CPA_ADMIN accessing `/settings` is blocked (403/redirect)
- [ ] Portal user can only see their own client's data

### Staff workflow
- [ ] Create a client → appears in `/clients` list
- [ ] Create an engagement → appears on client detail Engagements tab
- [ ] Upload a document (INTERNAL) → not visible in portal documents
- [ ] Change document visibility to CLIENT_VISIBLE → appears in portal
- [ ] Create a document request → appears on client portal requests page
- [ ] Create a message thread (CLIENT_STAFF) → visible in portal messages
- [ ] Create a message thread (INTERNAL) → NOT visible in portal messages
- [ ] Publish a notice with CLIENT_VISIBLE document → appears in portal notices
- [ ] Attempt to publish notice with INTERNAL document → error thrown
- [ ] Send a signature request → client sees "Sign now" button in portal
- [ ] Create a task → appears in `/tasks` with correct priority/status

### Portal workflow
- [ ] portal@techflow.ca can log in and sees TechFlow data
- [ ] Portal documents only show CLIENT_VISIBLE records
- [ ] Portal messages only show CLIENT_STAFF threads
- [ ] Portal messages thread view only shows non-internal messages
- [ ] Signature "Sign now" button links to correct viewUrl
- [ ] Document download goes through `/api/files/[id]?download=1` (authenticated)

### File security
- [ ] Direct storage path is never exposed in any API response
- [ ] Downloading a document belonging to a different client returns 404
- [ ] INTERNAL document download by CLIENT_USER returns 403

---

## Phase 2 roadmap

- AI/OCR extraction pipeline (extraction fields already in `Document` model)
- QuickBooks integration (invoice sync, payment status)
- Real signature provider (DocuSign / Dropbox Sign) — swap `SIGNATURE_PROVIDER` env var
- S3/GCS cloud storage — swap `STORAGE_PROVIDER` env var
- SendGrid / SES email delivery — swap `EMAIL_PROVIDER` env var
- Two-factor authentication
- Bulk document upload with drag-and-drop
- Client self-registration and onboarding flow
