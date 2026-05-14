# Workflow B — Client Document Request Workflow

**Roles:** Client (`portal@techflow.ca`) then CPA Admin (`cpa@barranaaccounting.ai`)
**Time estimate:** 10–15 minutes
**Purpose:** Verify that a client can upload a file against an open document request, and that the staff side picks it up correctly for review.

---

## Prerequisites

- App is running and accessible
- Seed data has been loaded (see [Test Setup](./00-test-setup.md))
- You have a small test file ready to upload (any PDF, image, or spreadsheet under 25 MB)
- Use two browser windows or profiles — one for the client, one for staff

---

## Part 1 — Client side

### 1. Sign in as the client

1. Go to the login page
2. Enter email: `portal@techflow.ca`
3. Enter password: `Demo1234!`
4. Click **Sign in**

**Expected:** You are redirected to the client portal dashboard at `/portal/dashboard`

---

### 2. Review the dashboard action banner

**Expected:** A yellow banner appears at the top of the dashboard stating that items need your attention. The banner links to **View requests**.

---

### 3. Open the Requests page

1. Click **Requests** in the top navigation, or click **View requests** in the banner

**Expected:** The requests page shows requests grouped into sections. The **Action required** section should contain at least one request:

- **2024 Bank Statements — All accounts** (status: REQUESTED)

---

### 4. Upload a file against the request

1. Find **2024 Bank Statements — All accounts** in the Action required section
2. A file upload form should be visible below the request description
3. Click **Choose File** (or equivalent) and select a test file from your device
4. Click **Submit**

**Expected:** The page reloads. The request moves from the **Action required** section into the **In progress** section, and its status changes to **UPLOADED**.

> If the upload form is not visible, confirm the request status is REQUESTED, NEEDS_REPLACEMENT, or REJECTED. Accepted and waived requests do not show the form.

---

### 5. Confirm the uploaded document appears

1. Click **Documents** in the top navigation

**Expected:** The document you just uploaded appears in the list. Its status is UNREVIEWED.

---

## Part 2 — Staff side (switch browser/profile)

### 6. Sign in as CPA Admin

1. In a second browser window or profile, go to the login page
2. Sign in as `cpa@barranaaccounting.ai` / `Demo1234!`

**Expected:** Staff dashboard loads

---

### 7. Check the dashboard for the upload notification

**Expected:** The staff dashboard shows the newly uploaded document under the documents awaiting review section or recent activity.

---

### 8. Find the uploaded document

1. Click **Documents** in the left sidebar
2. Look for the document just uploaded by the client — it will have been uploaded by James Okoye and have status **UNREVIEWED**

---

### 9. Open the document detail

1. Click on the uploaded document

**Expected:** The document detail page shows:
- The file uploaded by the client
- Uploaded by name showing the client's name
- A "Client" badge next to the uploader name
- The linked document request in the Linked to section
- Review status currently set to UNREVIEWED

---

### 10. Accept the uploaded document

1. In the **Review status** panel on the right, change the dropdown to **Accept**
2. Click **Update review status**

**Expected:** The review status badge updates to ACCEPTED. The linked document request on the client side will also move to ACCEPTED status.

---

### 11. Confirm the request status updated

1. Switch back to the client browser window
2. Reload the **Requests** page

**Expected:** The request has moved from **In progress** to **Completed** with status ACCEPTED.

---

## Pass / Fail

- [ ] Client dashboard shows action banner
- [ ] Requests page shows request in Action required with upload form
- [ ] File uploads successfully
- [ ] Request moves to In progress after upload
- [ ] Uploaded document appears in client portal Documents
- [ ] Staff dashboard reflects the upload
- [ ] Staff document detail shows client as uploader with Client badge
- [ ] Staff sets review status to ACCEPTED
- [ ] Client requests page reflects the ACCEPTED status

---

## Notes

```
Bug:

Confusing:

Missing:

Nice to have:
```
