# Workflow E — File Access Protection

**Roles:** Client (`portal@techflow.ca`) and CPA Admin (`cpa@barranaaccounting.ai`)
**Time estimate:** 10–15 minutes
**Purpose:** Verify that file downloads and views are protected server-side. The correct client can access their own client-visible files. Access is blocked when a client tries to access another client's file or an internal-only file.

---

## Prerequisites

- App is running and accessible
- Seed data has been loaded (see [Test Setup](./00-test-setup.md))
- The seed includes documents for both TechFlow and Greenleaf clients
- You will need to note specific document IDs from the browser URL bar during testing

---

## Part 1 — Confirm correct client can access their files

### 1. Sign in as the client

1. Go to the login page
2. Enter email: `portal@techflow.ca`
3. Enter password: `Demo1234!`
4. Click **Sign in**

**Expected:** Client portal dashboard loads

---

### 2. Open the Documents page

1. Click **Documents** in the top navigation

**Expected:** Three documents appear (all marked CLIENT_VISIBLE):
- TechFlow Engagement Letter 2024
- Q3 2024 Financial Statements
- 2024 T2 Corporate Tax Return — Draft

---

### 3. View a document

1. Click **View** next to **TechFlow Engagement Letter 2024**

**Expected:** The document opens in a new browser tab as a PDF. Note the URL — it will be in the format `/api/files/seed-doc-1` (not a direct file path).

> The URL never exposes the raw storage path. It always goes through the authenticated API route.

---

### 4. Download a document

1. Back on the Documents page, click **Download** next to any document

**Expected:** The file downloads to your device. The download proceeds without a login prompt — your session is already authenticated.

---

## Part 2 — Attempt to access another client's file

### 5. Get a Greenleaf document ID

This requires a second step — we need the ID of a document belonging to Greenleaf (a different client):

**The seeded Greenleaf document ID is:** `seed-doc-5`

The file URL for this document would be: `/api/files/seed-doc-5`

---

### 6. Attempt to access the Greenleaf document as the TechFlow client

1. While signed in as `portal@techflow.ca`, manually enter this URL in the browser address bar:

```
http://localhost:3000/api/files/seed-doc-5
```

(Replace `localhost:3000` with your Render URL if testing on Render)

**Expected:** Access is denied. You should receive a **403 Forbidden** or **404 Not Found** response. You should NOT be able to view or download Greenleaf's document.

---

### 7. Attempt to access an internal document as the client

The seeded internal document ID is: `seed-doc-3` (Q4 2024 Payroll Summary — marked INTERNAL)

1. While signed in as `portal@techflow.ca`, manually enter this URL:

```
http://localhost:3000/api/files/seed-doc-3
```

**Expected:** Access is denied with a **403 Forbidden** response. Internal documents must never be accessible to client users, even if they belong to the correct client.

---

## Part 3 — Confirm staff can access internal files

### 8. Sign in as CPA Admin (second browser)

1. In a second browser window, sign in as `cpa@barranaaccounting.ai` / `Demo1234!`

---

### 9. Access the internal document as staff

1. In the staff browser, go to:

```
http://localhost:3000/api/files/seed-doc-3
```

**Expected:** The file opens or downloads successfully. Staff members can access all documents regardless of visibility setting.

---

### 10. Access a different client's document as staff

1. In the staff browser, go to:

```
http://localhost:3000/api/files/seed-doc-5
```

**Expected:** The file opens or downloads successfully. Staff can access documents across all clients.

---

## Part 4 — Confirm unauthenticated access is blocked

### 11. Attempt to access a file without logging in

1. Open a private/incognito browser window (no session)
2. Go to:

```
http://localhost:3000/api/files/seed-doc-1
```

**Expected:** You are redirected to the login page, or you receive a **401 Unauthorized** response. No file content is returned.

---

## Pass / Fail

- [ ] Client can view their own CLIENT_VISIBLE document via `/api/files/[id]`
- [ ] Client can download their own CLIENT_VISIBLE document
- [ ] File URL uses `/api/files/[id]` format — raw storage path is never shown
- [ ] Attempting to access another client's document returns 403 or 404
- [ ] Attempting to access an INTERNAL document as a client returns 403
- [ ] Staff can access INTERNAL documents
- [ ] Staff can access documents across all clients
- [ ] Unauthenticated request to a file URL redirects to login or returns 401

---

## Notes

```
Bug:

Confusing:

Missing:

Nice to have:
```
