# My WriteX Monday Founder UAT Checklist

Run from the repository root:

```powershell
.\start-my-writex-founder-uat.ps1
```

Stop after review:

```powershell
.\stop-my-writex-founder-uat.ps1
```

Use only the localhost page opened by the launcher. Record one verdict per journey: **GO**, **CHANGE**, or **NO-GO**.

| Journey | Founder action | Route | Test credentials | Expected result | Verdict | Notes |
|---|---|---|---|---|---|---|
| A — WriteX ID customer login | Enter the WriteX ID and registered phone, then sign in | `/client-login` | `rahulsharma.7k2` / `+447700900001` | Generic login completes and opens full customer My WriteX | ☐ GO ☐ CHANGE ☐ NO-GO | |
| B — Home | Review the welcome, priority project, upcoming work, jobs, manager, and quick actions | `/my-writex` | `rahulsharma.7k2` / `+447700900001` | Customer-wide home is coherent and contains only local fixture content | ☐ GO ☐ CHANGE ☐ NO-GO | |
| C — Projects | Open the projects list and scan status, dates, and navigation | `/my-writex/projects` | `rahulsharma.7k2` / `+447700900001` | Both authorized fixture projects appear; no unrelated customer data appears | ☐ GO ☐ CHANGE ☐ NO-GO | |
| D — Project Room | Open Research Proposal and review Overview, Quality, Files, Payment, and Support | `/my-writex/projects/project-research-proposal` | `rahulsharma.7k2` / `+447700900001` | One consistent project workspace appears with safe fixture details | ☐ GO ☐ CHANGE ☐ NO-GO | |
| E — Start New Requirement | Start a new requirement and complete the four-step flow without submitting yet | `/my-writex/new-requirement` | `rahulsharma.7k2` / `+447700900001` | Service/category/title/scope/deadline/brief/review steps work; title words capitalize | ☐ GO ☐ CHANGE ☐ NO-GO | |
| F — Draft autosave + refresh | Enter draft fields, wait for saved state, refresh, and continue | `/my-writex/new-requirement` | `rahulsharma.7k2` / `+447700900001` | The isolated local draft restores with the entered safe fields | ☐ GO ☐ CHANGE ☐ NO-GO | |
| G — Submit requirement | Review and send the completed requirement once | `/my-writex/new-requirement` | `rahulsharma.7k2` / `+447700900001` | One local request reference is created; confirmation says it was sent to Aman; no real message/payment/record is created | ☐ GO ☐ CHANGE ☐ NO-GO | |
| H — My Requests | Open the new request from the list | `/my-writex/requests` | `rahulsharma.7k2` / `+447700900001` | The request, status, next action, and history are visible | ☐ GO ☐ CHANGE ☐ NO-GO | |
| I — More Information Needed | In the development inspector, select the new request and request more information | `/dev/my-writex-requests` | Local inspector; customer fixture remains signed in | Status becomes **More Information Needed** with a safe manager prompt | ☐ GO ☐ CHANGE ☐ NO-GO | |
| J — Customer response | Return to request detail and submit a short response | `/my-writex/requests/{new-request-reference}` | `rahulsharma.7k2` / `+447700900001` | Response is stored only locally; history updates and status returns to review | ☐ GO ☐ CHANGE ☐ NO-GO | |
| K — Order Similar Work | From Project Room, choose **Order Similar Work** and inspect the prefill | `/my-writex/projects/project-research-proposal` | `rahulsharma.7k2` / `+447700900001` | Safe project context is reused; old deadlines, payment facts, credentials, and private instructions are not copied | ☐ GO ☐ CHANGE ☐ NO-GO | |
| L — Upcoming Work → Prepare Requirement | Open an upcoming item and choose **Prepare Requirement** | `/my-writex/upcoming` | `rahulsharma.7k2` / `+447700900001` | The new requirement carries only approved upcoming-work context and prevents duplicate conversion | ☐ GO ☐ CHANGE ☐ NO-GO | |
| M — Career / Jobs / CV Studio shells | Open each shell and try its local-only interactions | `/my-writex/career`, `/my-writex/career/jobs`, `/my-writex/career/cv` | `rahulsharma.7k2` / `+447700900001` | Fixtures are clearly labelled, usable, and do not submit applications or publish a CV | ☐ GO ☐ CHANGE ☐ NO-GO | |
| N — Manager / Relationship | Review manager details and the relationship timeline | `/my-writex/manager`, `/my-writex/account` | `rahulsharma.7k2` / `+447700900001` | Aman and the local relationship history are consistent across pages; no real contact is sent | ☐ GO ☐ CHANGE ☐ NO-GO | |
| O — Invoice-only customer | Log out, then sign in with the invoice identifier and registered phone | `/client-login` | `WX-MW-1001` / `+447700900001` | Invoice workspace opens with only the authorized invoice/project | ☐ GO ☐ CHANGE ☐ NO-GO | |
| P — Invoice customer denied full My WriteX | While invoice-only is signed in, navigate directly to full My WriteX | `/my-writex` | `WX-MW-1001` / `+447700900001` | Access is denied/redirected to `/client/overview`; no customer-wide history is exposed | ☐ GO ☐ CHANGE ☐ NO-GO | |
| Q — Logout | Use Logout, then revisit the protected route | `/client/logout`, then `/client/overview` | Invoice-only session | Session is revoked/cleared and the protected page returns to login | ☐ GO ☐ CHANGE ☐ NO-GO | |
| R — Mobile 390×844 review | Set viewport to 390×844 and repeat login, Home, Projects, Project Room, New Requirement, Requests, Career, and invoice workspace | Same routes above | Use the matching customer or invoice fixture | No horizontal overflow, clipped controls, hidden actions, unreadable text, or broken sticky/mobile navigation | ☐ GO ☐ CHANGE ☐ NO-GO | |

Final Founder decision: ☐ **GO** ☐ **CHANGE** ☐ **NO-GO**

Decision notes:

________________________________________________________________________________

Production modified: **NO**. Production deployed: **NO**. LTS modified: **NO**. Production data modified: **NO**.
