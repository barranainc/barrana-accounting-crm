# Test Setup — Barrana Accounting CRM

Before running any workflow test, complete this setup once.

---

## Access

Open the app in your browser. You will be taken to the login page.

If testing locally: `http://localhost:3000`
If testing on Render: your Render app URL

---

## Demo credentials

All accounts use the same password: **`Demo1234!`**

| Role | Email | What they can access |
|---|---|---|
| Super Admin | admin@barranaaccounting.ai | Everything including settings and audit log |
| CPA Admin | cpa@barranaaccounting.ai | All staff features including audit log |
| Assistant | assistant@barranaaccounting.ai | All staff features except audit log and settings |
| Client (TechFlow) | portal@techflow.ca | Client portal for TechFlow Solutions only |

---

## Pre-seeded demo data

The following data is already in the system when you run the seed script:

**Clients**
- TechFlow Solutions Inc. — active, linked to the portal@techflow.ca account
- Greenleaf Realty Group — active, no portal user

**Engagements**
- TechFlow — Corporate Tax 2024 (Active)
- TechFlow — Bookkeeping Q4 2024 (Waiting on client)
- Greenleaf — Corporate Tax FY2024 (In review)

**Documents (TechFlow — CLIENT_VISIBLE and viewable)**
- TechFlow Engagement Letter 2024
- Q3 2024 Financial Statements
- 2024 T2 Corporate Tax Return — Draft

**Document requests (TechFlow)**
- 2024 Bank Statements — All accounts → status: REQUESTED (action required)
- Q4 2024 Payroll Summary → status: UPLOADED
- Signed Engagement Letter → status: ACCEPTED

**Notices**
- 2024 T2 Draft Ready — Please Review → status: DRAFT (ready to publish)
- 2024 Engagement Letter — TechFlow Solutions → status: PUBLISHED

**Signature requests (TechFlow)**
- Sign: 2024 Engagement Letter → status: SIGNED (historical)
- Review & Sign: 2024 T2 Corporate Tax Return → status: SENT (pending — ready to sign)

**Message thread**
- 2024 Corporate Tax Return — Questions (CLIENT_STAFF, 3 messages)

---

## Workflow documents

| # | Workflow | Role(s) involved |
|---|---|---|
| [01](./01-workflow-A-staff-operations.md) | Staff operational workflow | CPA Admin |
| [02](./02-workflow-B-client-document-request.md) | Client document-request workflow | Client + CPA Admin |
| [03](./03-workflow-C-notice-publication.md) | Notice publication workflow | CPA Admin + Client |
| [04](./04-workflow-D-signature.md) | Signature workflow | Client |
| [05](./05-workflow-E-file-access-protection.md) | File access protection | Client + CPA Admin |

---

## Feedback format

When reporting issues, use these four headings:

- **Bug** — something that does not work as described
- **Confusing** — something that works but is unclear
- **Missing** — an action or screen the team expected but could not find
- **Nice to have** — a suggestion for improvement
