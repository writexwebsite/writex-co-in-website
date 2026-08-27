# My WriteX ↔ LTS Current-State Identity Map

## Evidence boundary

This map is readiness evidence, not an assertion about the current live service.

| Item | Observed value | Evidence |
|---|---|---|
| Sanitized backend repository | `C:\Users\Writex\WriteX-Secure-Backups\LTS-Backend\20260801T155041Z\company-recovery-sanitized-20260802` | E1 |
| Checked-out branch | `recovered-live-worktree-20260802` | E1 |
| Checked-out commit | `8a57b8932269637c2b58f760de5f74e4c94a1bdd` | E1 |
| Working-tree status | Clean for tracked files during this review | E1 |
| Provenance | `e217f470…` is a parentless sanitized snapshot tied to historical production commit `5d699308…`; `8a57b893…` preserves the recovered live worktree delta | E1 |
| Database source | Local ZIP `Dump20260717.zip`; SQL dump header reports MySQL 8.0.44 / `writex_lts` | E1 |
| Database snapshot label | 17 July 2026 | E1 |
| Aggregate reproduction | 201,444 leads; 16,894 invoices; 17,622 assignments parsed read-only | E2 |
| Production parity | **Unknown and unverified** | — |

No `.env` file, credential, raw customer row, production endpoint, staging service, or live database was inspected. No E3 or E4 claim is made.

## Current identity flow

```text
leads.leadId
  ├─ leadStage 5/6/7 is treated as Customer state
  ├─ assignedTo / createdBy points to users.userId (BDE/owner ambiguity)
  └─ repeated contact fields: firstName, lastName, whatsappNumber, email
       ↓
invoices.leadId (not protected by an observed FK)
  ├─ repeats firstName, lastName, whatsappNumber
  ├─ createdBy → users.userId
  └─ invoiceId / invoiceNo
       ├─ invoicepaymentdetails.invoiceId → invoices.invoiceId
       └─ assignments.invoiceId → invoices.invoiceId
             ├─ assignments.leadId (not protected by an observed FK)
             ├─ assignment/project documents stored as text/path fields
             └─ taskdetails / taskdelivereds / taskqueries / tasksolutions / taskextentions
                    ↓
                delivery, queries, solutions, revisions/extensions, files
```

The important structural fact is that “Customer” is a workflow state of a lead, not a separate durable entity. Customer controllers import `leadModel` and filter `leadStage`; observed comments define 5 = Potential Customer, 6 = Active Customer, and 7 = Inactive Customer.

## Source objects

| Domain | Tables/models | Key fields and relationships | Controllers/routes observed | Reliability |
|---|---|---|---|---|
| Lead | `leads` / `leadModel.js` | `leadId`; one `whatsappNumber`; one `email`; `dialCode`; `leadStage`; `assignedTo`; `createdBy`; referral and conversion dates | `/lead/leadList`, `/lead/leadEntry`, `/lead/:id`, `/lead/leadStatus`, `/lead/leadByWhatsapp`, `/lead/leadAssigned`, filters/import/export | Primary record exists, but contact uniqueness/canonical form is not enforced by the observed schema. |
| Customer state | No separate customer model; customer controllers query `leads` | `leadStage >= 5`; active/inactive transitions update the lead row | `/customer/customerList`, `/customer/activeCustomer`, `/customer/inActiveCustomer`, `/customer/customerInvoiceAssignmentList`, `/customer/particularCustomer`, referral/import/export | Mutable workflow classification, not immutable customer identity. |
| Invoice | `invoices` / `invoiceModel.js` | `invoiceId`, `invoiceNo`, `leadId`; repeats customer name and phone; `createdBy` → users | `/invoice/invoice`, `/invoice/invoiceList`, `/invoice/:id`, `/invoice/payment/:id`, approvals, filters, exports | `leadId` has no observed DB foreign key; repeated contact data can diverge. |
| Payment | `invoicepaymentdetails` | `invPaymentId`; `invoiceId` FK; duplicated `invoiceNo` and `leadId`; amount/status/proof/transaction fields | `/invoice/invoicePayment`, `/invoice/payment/:id`, account approve/reject/status flows | Invoice FK is strong; customer ownership remains indirect through invoice/lead. |
| Assignment/project | `assignments` / `assignmentModel.js` | `assignmentId`; `invoiceId` FK; `leadId`; `taskId`; status, deadline, subject, module and document fields | `/assignment/assignment`, lists/detail/status, approval, delivery docs, rework/redo/resit | Invoice FK is present; `leadId` is not protected by an observed FK and is often missing historically. |
| Delivery | `taskdetails`, `taskdelivereds` | Link by assignment/task/invoice/lead IDs; `deliverableDocs`, completion flags, `markAsDelivered` | assignment delivery route plus task allocation/detail routes | Multiple redundant IDs create reconciliation risk; file references are not centralized. |
| Support/revisions | `taskqueries`, `tasksolutions`, `taskextentions`; `ltsinboxes` plus comment/reply tables | Assignment/task links, free-text query/solution, attachments, sender/recipient/status | `/task/assignmentQueryList`, `/task/assignmentQuerySolution`, extension routes; `/inbox/*` | Internal workflow exists; no observed public object-level customer authorization boundary. |
| BDE/owner | `users`; references in lead/invoice/assignment | Lead `assignedTo`, lead `createdBy`, invoice `createdBy`, assignment `createdBy`; user has `userName`, phone, alt phone, email | user and customer list controllers join different aliases | Meaning is inconsistent: assignee, creator, and invoice creator are separate signals. |
| Phones | Lead columns only for customer; user columns for staff | `dialCode` + `whatsappNumber`; no customer phone-child/history table | Phone lookup in lead controllers | One current value only; no verified flag, alias type, validity window, or uniqueness constraint observed. |
| Emails | Lead `email` only for customer | No customer email-child/history table | Search/filter only | Sparse and no verified provenance observed. |
| Uploaded/delivered files | Text/path fields across leads, invoices/payments, assignments, task details/delivery, inbox | `docProofOfLead`, `docProofOfPayment`, assignment docs, `taskDoc`, `deliverableDocs`, attachments | upload and delivery controllers | No central customer-safe file registry or uniform ownership policy observed. |
| Existing Client Login | None observed in recovered LTS backend | Staff JWT middleware protects LTS routes | No customer auth/portal route observed | Website portal is currently a separate system; LTS source does not supply a public Client Login contract. |
| Website invoice workspace | Website tables/migrations: `client_sessions`, `client_portal_credentials`, `portal_invoice_cache`, `revision_requests`, `file_assets`; Stage 3A adds invoice/customer `auth_scope` separation | Invoice sessions own one `invoice_id`; customer sessions use local `customer_master_id` fixtures | Website `/api/client/*` and `/api/my-writex/*` | Local Stage 3A behavior is E2; real Customer Master/LTS linkage is not active. |

## Ten identity answers

1. **One permanent customer record?** No. No separate permanent Customer Master was observed.
2. **Customers represented only through lead stages?** Yes in the recovered source: customer controllers use lead rows and stages 5–7.
3. **Existing Client ID?** `leadId` is the de facto internal reference, but it is a mutable lead identity and not a customer-facing permanent Client ID.
4. **Existing customer username?** No. `users.userName` belongs to staff users, not customers.
5. **Multiple phones per customer?** Not structurally. One lead WhatsApp number is stored; aliases/history are absent.
6. **Multiple emails per customer?** Not structurally. One optional lead email is stored; verification/history are absent.
7. **Invoice linkage?** `invoices.leadId`, plus duplicated name/phone. The dump does not show a foreign key from invoice `leadId` to lead.
8. **Assignment linkage?** Primarily `assignments.invoiceId` (observed FK), with redundant `assignments.leadId`. Task and delivery tables repeat assignment/invoice/lead identifiers.
9. **Assigned BDE storage?** Lead `assignedTo` is the strongest explicit assignment; `createdBy`, invoice `createdBy`, and assignment `createdBy` are separate operational signals.
10. **Missing/unreliable relationships?** Permanent customer ownership, phone/email history and verification, customer-facing ID, invoice→customer FK, assignment→customer FK, centralized files, customer-safe support authorization, manager history, merge ledger, and portal-account linkage.

## Production-parity unknowns

- Whether live production still runs commit `5d699308…` plus the recorded three-file worktree delta.
- Any source, schema, or data changes after the July 17 dump and August 2 recovery.
- Current row counts, constraints, indexes, triggers, and migration history.
- Whether a separate Client Login/UI V2 repository exists; prior discovery did not find an authoritative source.
- Whether live application code relies on implicit data conventions not represented by Sequelize associations.
- Which staff field is the authoritative long-term customer manager.
- Phone-country and email-verification semantics.
- Current retention, file-storage, and customer-data access policies.

## Integration implication

My WriteX must use a versioned BFF/integration service that resolves a permanent Customer Master and returns public references. It must not query arbitrary LTS tables or use lead name, invoice phone, `leadId`, `invoiceId`, or WriteX ID as the database ownership key.

Production modified: **NO**. LTS modified: **NO**. Live customer records modified: **NO**.
