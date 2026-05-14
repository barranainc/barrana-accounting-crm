# Workflow D — Signature Workflow

**Role:** Client (`portal@techflow.ca`)
**Time estimate:** 5–10 minutes
**Purpose:** Verify that the client can see a pending signature request, go through the mock signing flow, confirm their signature, and see a success confirmation.

---

## Prerequisites

- App is running and accessible
- Seed data has been loaded (see [Test Setup](./00-test-setup.md))
- The seed includes one pending signature request for the client:
  **Review & Sign: 2024 T2 Corporate Tax Return** (status: SENT)

---

## Steps

### 1. Sign in as the client

1. Go to the login page
2. Enter email: `portal@techflow.ca`
3. Enter password: `Demo1234!`
4. Click **Sign in**

**Expected:** Client portal dashboard loads

---

### 2. Review the dashboard signature section

**Expected:** The **Signature requests** section on the dashboard shows:
- Review & Sign: 2024 T2 Corporate Tax Return — status: SENT

The dashboard may also show a count of pending items needing attention.

---

### 3. Open the Signatures page

1. Click **Signatures** in the top navigation

**Expected:** The signatures page loads and shows:
- A purple banner at the top indicating 1 document awaiting signature
- **Review & Sign: 2024 T2 Corporate Tax Return** with status **SENT** and a **Sign now** button
- **Sign: 2024 Engagement Letter** with status **SIGNED** (historical, no action button)

---

### 4. Review the signature request details

On the **Review & Sign: 2024 T2 Corporate Tax Return** card, confirm the following is visible:
- Document name: 2024 T2 Corporate Tax Return — Draft
- Engagement: TechFlow — Corporate Tax 2024
- Date sent
- Expiry date
- A message from the accountant

---

### 5. Click Sign now

1. Click the **Sign now** button on the pending signature request

**Expected:** The browser navigates through `/api/portal/signatures/[id]/sign` (this is a server-side redirect — you will not see this URL for long) and lands on a mock signing page.

---

### 6. Review the mock signing page

**Expected:** The signing page shows:
- The signature request title
- The client's business name (TechFlow Solutions Inc.)
- An amber notice banner explaining this is a demo environment
- A document card showing the file name, size, and a "View document" link
- The message from the accountant (if present)
- A **Confirm signature** button and a Cancel link

---

### 7. Click View document (optional)

1. Click **View document** on the document card

**Expected:** The PDF opens in a new browser tab. You should be able to see the document contents (a minimal demo PDF). Close the tab when done.

---

### 8. Confirm the signature

1. Click **Confirm signature**

**Expected:** The page processes the signature and redirects back to `/portal/signatures`. A green success banner appears at the top of the page:

> **Document signed successfully**
> Your signature has been recorded. Your accountant has been notified.

---

### 9. Confirm the status has updated

**Expected:** The signature request **Review & Sign: 2024 T2 Corporate Tax Return** now shows status **SIGNED**. The **Sign now** button is gone. A signed date is displayed.

---

### 10. Confirm staff notification (optional — requires staff browser)

1. In a second browser, sign in as `cpa@barranaaccounting.ai`
2. Open the staff **Signatures** page (`/signatures`)

**Expected:** The signature request now shows status **SIGNED** with the signed date/time.

---

## Pass / Fail

- [ ] Dashboard shows pending signature request
- [ ] Signatures page shows pending request with Sign now button
- [ ] Sign now button redirects through the API route to the mock signing page
- [ ] Mock signing page shows document card, accountant message, and Confirm button
- [ ] View document opens the PDF in a new tab
- [ ] Confirm signature redirects to signatures list with green success banner
- [ ] Signature request status changes to SIGNED
- [ ] Sign now button disappears after signing
- [ ] Staff side reflects the SIGNED status

---

## Notes

```
Bug:

Confusing:

Missing:

Nice to have:
```
