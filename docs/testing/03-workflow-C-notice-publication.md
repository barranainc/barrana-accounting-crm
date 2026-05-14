# Workflow C — Notice Publication Workflow

**Roles:** CPA Admin (`cpa@barranaaccounting.ai`) then Client (`portal@techflow.ca`)
**Time estimate:** 10 minutes
**Purpose:** Verify that a staff member can publish a draft notice and that the client immediately sees it in their portal, can open it, and that the viewed state is tracked.

---

## Prerequisites

- App is running and accessible
- Seed data has been loaded (see [Test Setup](./00-test-setup.md))
- The seed includes one DRAFT notice: **2024 T2 Draft Ready — Please Review**
- Use two browser windows or profiles — one for staff, one for the client

---

## Part 1 — Staff publishes the notice

### 1. Sign in as CPA Admin

1. Go to the login page
2. Enter email: `cpa@barranaaccounting.ai`
3. Enter password: `Demo1234!`
4. Click **Sign in**

**Expected:** Staff dashboard loads

---

### 2. Open the Notices page

1. Click **Notices** in the left sidebar

**Expected:** The notices list loads. You should see at least:
- **2024 T2 Draft Ready — Please Review** with status **DRAFT**
- **2024 Engagement Letter — TechFlow Solutions** with status **PUBLISHED**

---

### 3. Confirm the DRAFT notice has a Publish button

1. Find the row for **2024 T2 Draft Ready — Please Review**
2. Look in the Actions column on the right

**Expected:** A green **Publish** button is visible. If the notice's linked document were marked Internal, a warning "Doc is internal" would appear instead. In this case the linked document is already CLIENT_VISIBLE so the button should be active.

---

### 4. Publish the notice

1. Click **Publish** on the DRAFT notice row

**Expected:** The page reloads. The notice status changes from **DRAFT** to **PUBLISHED**. The Publish button disappears. A Published date is now shown.

---

### 5. Confirm the notice is published on the client detail page

1. Click **Clients** in the sidebar
2. Open **TechFlow Solutions Inc.**
3. Click the **Notices** tab

**Expected:** The published notice appears in the client's notices tab with status PUBLISHED.

---

## Part 2 — Client views the notice

### 6. Sign in as the client (second browser)

1. In a second browser window or profile, go to the login page
2. Enter email: `portal@techflow.ca`
3. Enter password: `Demo1234!`
4. Click **Sign in**

**Expected:** Client portal dashboard loads

---

### 7. Check the dashboard for the new notice

**Expected:** The **Notices & letters** section on the dashboard shows the newly published notice. It should appear with a **PUBLISHED** badge.

---

### 8. Open the Notices page

1. Click **Notices** in the top navigation

**Expected:** The notices page shows at least two notices:
- 2024 T2 Draft Ready — Please Review → PUBLISHED
- 2024 Engagement Letter — TechFlow Solutions → PUBLISHED or VIEWED

Notices that are still DRAFT on the staff side must not appear here.

---

### 9. Open and read the notice

1. Click on **2024 T2 Draft Ready — Please Review**

**Expected:** The notice detail page opens. It shows:
- The notice title and description
- The linked document with a View / Download button
- A message from your accountant or notice body text

---

### 10. Confirm viewed state is tracked (staff side)

1. Switch back to the staff browser
2. Click **Notices** in the sidebar
3. Find the notice just opened by the client

**Expected:** The **Viewed** column now shows a date. The notice status may have updated to **VIEWED**.

---

## Pass / Fail

- [ ] Notices list shows DRAFT notice with Publish button
- [ ] Publishing succeeds and status changes to PUBLISHED
- [ ] Client dashboard shows the published notice
- [ ] Client notices page shows PUBLISHED notice
- [ ] DRAFT notices do not appear in the client portal
- [ ] Client can open the notice and see the linked document
- [ ] Staff side shows the viewed timestamp after client opens the notice

---

## Notes

```
Bug:

Confusing:

Missing:

Nice to have:
```
