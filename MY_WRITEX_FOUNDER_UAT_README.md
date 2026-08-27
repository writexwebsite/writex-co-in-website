# My WriteX Founder UAT — Monday Runbook

Stage 3A is frozen at local commit `1f805b06d1cb88d2cdeea2b4e0e6ca6f9110298b` and annotated tag `my-writex-stage3a-founder-uat-candidate` on branch `feature/my-writex-v1`.

The launcher is localhost-only. It enables deterministic development fixtures, uses a dedicated ignored request store, explicitly disables the LTS/PMT integration mode, clears integration credentials and `DATABASE_URL` in the child process, and refuses to reuse an occupied port. It does not deploy, contact production mutation endpoints, or modify a production database.

## Start

From PowerShell in the repository root:

```powershell
.\start-my-writex-founder-uat.ps1
```

The script verifies:

- branch `feature/my-writex-v1`;
- the frozen tag and commit;
- that the checkpointed Stage 3A product files have not changed;
- exact hashes for shared login/chrome files that were already dirty outside the scoped checkpoint;
- Node.js, pnpm, and Git availability;
- that port 3000 is not occupied by another process;
- `MY_WRITEX_DEV_FIXTURES=true` and `INTEGRATION_MODE=disabled` for the launched child.

It starts `pnpm dev --hostname 127.0.0.1 --port 3000`, archives any prior local UAT request store, waits for `/client-login`, prints all credentials and routes, then opens the login page.

## Test credentials

Full WriteX ID fixture:

- WriteX ID: `rahulsharma.7k2`
- Registered phone: `+447700900001`
- Expected scope: customer-wide My WriteX

Invoice-only fixture:

- Invoice identifier: `WX-MW-1001`
- Registered phone: `+447700900001`
- Expected scope: one invoice/project workspace only

Negative separation fixture (contract testing only):

- WriteX ID: `sarahjones.9m4`
- Registered phone: `+447700900002`
- Expected result: Customer B cannot access Customer A resources.

## Direct routes

- Login: <http://127.0.0.1:3000/client-login>
- My WriteX home: <http://127.0.0.1:3000/my-writex>
- New requirement: <http://127.0.0.1:3000/my-writex/new-requirement>
- My Requests: <http://127.0.0.1:3000/my-writex/requests>
- Upcoming Work: <http://127.0.0.1:3000/my-writex/upcoming>
- Invoice workspace: <http://127.0.0.1:3000/client/overview>
- Development request inspector: <http://127.0.0.1:3000/dev/my-writex-requests>

## Founder test sequence

1. Sign in with the full WriteX ID fixture. Confirm the My WriteX home shows Rahul, multiple projects, Aman as manager, invoices, documents, and the relationship timeline.
2. Open New Requirement. Enter a lowercase title such as `strategic management report`; confirm it becomes `Strategic Management Report`.
3. Complete all four steps, attach only the supplied safe brief fixture if desired, review, and submit once. Confirm the acknowledgement and request reference.
4. Open My Requests and the request detail. Confirm status history and More Information Needed response handling.
5. Use Order Similar Work and Upcoming Work conversion. Confirm safe prefill and duplicate-conversion prevention.
6. Log out. Sign in with the invoice-only fixture. Confirm only `WX-MW-1001` project data is visible and customer-wide My WriteX routes are not authorized.
7. Try an incorrect identifier/phone pair. Confirm the error is generic and does not reveal which field exists.
8. Open the development request inspector and confirm only local fixture requests appear.

Expected result: every item above is GO, no horizontal overflow appears at the tested desktop/mobile widths, and no production record or notification is created.

## Stop

```powershell
.\stop-my-writex-founder-uat.ps1
```

The stop script validates the recorded PID and start time, discovers only its child process tree, stops that tree, and archives the process marker. It does not stop unrelated applications.

## Troubleshooting

- Wrong branch/tag or changed frozen files: return to `feature/my-writex-v1` and restore the exact local Stage 3A workspace. Do not force the launcher past the guard.
- Port 3000 occupied: identify and stop the process yourself only if it is known to be your prior local dev server; the launcher intentionally will not stop it.
- Startup failure: inspect `.local/my-writex-founder-uat/server.stderr.log` and `server.stdout.log`.
- Empty/old requests: each launcher run uses a fresh `requests.json`; previous stores are timestamped in the same `.local` directory.
- Login rejected: use the exact fixture identifiers and international phone format shown above.

## Evidence

- UAT report: `reports/my-writex-stage3a-uat/UAT_REPORT.md`
- Screenshots: `reports/my-writex-stage3a-uat/screenshots/`
- Regression result: 45 passed, 0 failed on 27 August 2026.

Production modified: **NO**. Production deployed: **NO**. LTS modified: **NO**. Production data modified: **NO**.
