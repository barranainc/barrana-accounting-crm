# Workflow A — Staff Operational Workflow

**Role:** CPA Admin (`cpa@barranaaccounting.ai`)
**Time estimate:** 15–20 minutes
**Purpose:** Verify that a staff member can navigate the full internal workspace — dashboard, client record, documents, notices, and tasks.

---

## Prerequisites

- App is running and accessible
- Seed data has been loaded (see [Test Setup](./00-test-setup.md))
- You are not already logged in (or have signed out)

---

## Steps

### 1. Sign in as CPA Admin

1. Go to the app login page
2. Enter email: `cpa@barranaaccounting.ai`
3. Enter password: `Demo1234!`
4. Click **Sign in**

**Expected:** You are redirected to the staff dashboard at `/dashboard`

---

### 2. Review the staff dashboard

On the dashboard, check that each of the following sections is visible and shows data:

- Documents awaiting review
- Overdue tasks
- Pending signature requests
- Recent messages

**Expected:** At least one item appears in each section based on the seeded data. No blank or error states.

---

### 3. Open the client list

1. Click **Clients** in the left sidebar

**Expected:** A list appears showing at least TechFlow Solutions Inc. and Greenleaf Realty Group with their status, industry, and province.

---

### 4. Open the TechFlow client record

1. Click on **TechFlow Solutions Inc.**

**Expected:** The client detail page opens showing the client name, business number, address, and a row of tabs across the top.

---

### 5. Review each client tab

Work through each tab and confirm it loads without errors:

**Overview tab**
- Check that internal notes, status, and flags are visible
- Check that key fields (business number, HST number, address) are displayed

**Contacts tab**
- Check that James Okoye and Aisha Patel appear
- Check that James is marked as the primary contact with portal access

**Engagements tab**
- Check that Corporate Tax 2024 and Bookkeeping Q4 2024 appear
- Check status badges are correct (Active, Waiting on Client)

**Documents tab**
- Check that all 5 seeded TechFlow documents appear
- Check that visibility (Internal / Client Visible) is shown for each

**Requests tab**
- Check that all 3 document requests appear with status badges

**Messages tab**
- Check that the thread "2024 Corporate Tax Return — Questions" is visible
- Click the thread and confirm messages from both the CPA and the client appear

**Notices tab**
- Check that the engagement letter notice appears with status PUBLISHED

**Tasks tab**
- Check that tasks assigned to this engagement appear with due dates and priorities

**Audit tab**
- Check that audit events appear (document uploaded, signature sent, notice published)

**Expected for all tabs:** Data loads correctly. No tab shows a blank page or an error.

---

### 6. Open a document detail page

1. Click the **Documents** link in the sidebar
2. Click on **TechFlow Engagement Letter 2024**

**Expected:** The document detail page opens showing:
- File name, size, type, category, version
- Linked client, engagement, and document request
- Who uploaded it and when
- A review status dropdown on the right side
- A visibility toggle on the right side
- Comments section (empty or with content)

---

### 7. Change the document review status

1. On the document detail page, find the **Review status** panel on the right
2. Change the dropdown from its current value to **Under review**
3. Click **Update review status**

**Expected:** The page reloads and the status badge at the top now shows **Under review**. The status panel shows the updated current status.

---

### 8. Change document visibility

1. On the same document detail page, find the **Visibility** panel
2. If the document is Client Visible, click **Make internal**
3. If it is Internal, click **Make client-visible**

**Expected:** The visibility badge at the top of the page updates. The button label changes to the opposite action.

> Revert it back to its original state after testing.

---

### 9. Publish a draft notice

1. Click **Notices** in the left sidebar
2. Find the notice titled **2024 T2 Draft Ready — Please Review** with status **DRAFT**
3. Click **Publish** in the Actions column

**Expected:** The notice status changes from DRAFT to PUBLISHED. The Publish button disappears from that row. If you are signed in as the portal client in another browser, the notice will now appear in their portal.

---

### 10. Review the tasks list

1. Click **Tasks** in the left sidebar

**Expected:** A list of tasks appears. At least one task should be marked as overdue (shown in red or with an overdue indicator). Tasks show assignee, priority, and due date.

---

### 11. Confirm audit log access

1. Click **Audit** in the left sidebar (visible to CPA Admin and Super Admin only)

**Expected:** A log of system events appears — document uploads, signature events, notice publications. Each entry shows the actor, action, and timestamp.

> If signed in as Assistant (`assistant@barranaaccounting.ai`), this menu item should not appear or should redirect to an unauthorised page.

---

## Pass / Fail

Mark each item after testing:

- [ ] Login succeeds and redirects to dashboard
- [ ] Dashboard shows seeded data in all sections
- [ ] Client list shows both clients
- [ ] All 9 client detail tabs load without errors
- [ ] Document detail page shows all metadata
- [ ] Review status update saves and reflects on the page
- [ ] Visibility toggle saves and reflects on the page
- [ ] Draft notice publishes successfully
- [ ] Tasks list shows overdue indicators
- [ ] Audit log is accessible and shows events

---

## Notes

Record any bugs, confusing labels, missing actions, or suggestions below:

```
Bug:

Confusing:

Missing:

Nice to have:
```
