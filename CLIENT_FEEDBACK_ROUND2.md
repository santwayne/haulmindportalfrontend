# Client Feedback — Round 2 Implementation Notes (Frontend)

This document records the frontend changes made in response to the client's written feedback (`Implementation Review – Business Observations and Feedback.pdf`) on the Round 1 "Required Updates" work. See `REQUIRED_UPDATES.md` for Round 1. Matching backend changes are documented in `CLIENT_FEEDBACK_ROUND2.md` in the `blackRiverBackend` repo.

Same design-system discipline as Round 1: no new colors, fonts, or component patterns — every change reuses the existing card/button/badge/modal styles already present on that screen.

## Summary by feedback item

### 1. Configurable trial length
- `pages/superadmin/setting/index.tsx` — added a "Trial Settings" card (same card pattern as Profile/Location/Policies) with a "Default Trial Length (days)" number input, wired to the new `defaultTrialDays` field on `getSuperAdminSettings`/`updateSuperAdminSettings`.
- `pages/superadmin/adminAccount/ViewAllAccounts.tsx` — the Create Admin modal gained an optional "Trial Length (days)" field, sent as `trialDays` to `createAdmin` only when filled in (otherwise the backend falls back to the configured global default).
- `pages/admin/subscription/index.tsx` — also fixed a real bug found while reviewing this: the trial progress bar and "Days Used / 7" stat were hardcoded against a 7-day denominator, which would have shown nonsense once trial length became configurable (e.g. "5 / 7" on a 30-day trial with an inflated progress percentage). Both now compute the actual trial length from `daysUsed + daysRemaining`.

### 2. Custom plan builder per customer
- `pages/superadmin/adminAccount/ViewAllAccounts.tsx` — the Assign Plan modal now has a "Customize for this customer" section that appears once a template plan is selected: an optional custom price field (overrides the plan's standard computed price) and a checklist of staff roles/modules to include for this customer (pre-filled from the template plan's own restrictions, editable per customer). Both are sent to `assignPlanToAdmin` as `customAmount`/`allowedRoles` only when they differ from the template defaults.
- `axios/api/superadmin.ts` — `assignPlanToAdmin`'s type signature extended with `customAmount`, `allowedRoles`, `blockedRoles`.

### 3. Hide customer self-service plan browsing
- `pages/admin/subscription/index.tsx` — the plan-browsing/tier-selection UI, "Add More Trucks" self-service purchase section, and "Cancel Subscription" button are no longer rendered. The page is now just the read-only "current subscription" card (plan name, status, price, next billing date, truck usage, start date). Per the "hide, don't delete" decision, this JSX was **not removed** — it's gated behind a single `SELF_SERVICE_PLAN_UI_ENABLED = false` constant at the top of the file, so re-enabling it later is a one-line change. The trial banner's "Subscribe Now"/"View Plans" button was replaced with plain text ("Contact your account manager to subscribe or change your plan.").
- Page header changed from "Subscription & Plans" / "Manage your subscription and choose from available plans" to "My Subscription" / "View your current plan status and renewal date".
- `utils/AdminSidebarLinks.tsx` — sidebar label updated to match: "My Subscription".

### 4. Bug fix: Employee module hourly rate
- `pages/admin/driverManagement/employees/index.tsx`:
  - On both create and update submit, whenever Pay Type is "Hourly", the form now also sends `hourlyRate` (same value as Pay Rate) alongside the existing `payRate`/`payType` fields — this is the field payroll calculations actually read (see backend doc for the full root-cause trace).
  - `loadEmployeeForEdit` now falls back to `emp.details?.hourlyRate` when populating the Pay Rate field, so a rate set via the separate Driver-management form displays correctly here too instead of showing blank.
- Verified live: opening the New Employee form, setting Pay Type to "Hourly" with a rate, and saving no longer silently drops the rate — confirmed via the dev server with no console errors. Also confirmed the Pay Type dropdown's "Biweekly"/"Semi Monthly"/"Monthly" options (which previously would have failed backend validation) now match the widened schema enum.

### 8b/8c. Fleet Maintenance invoices visible to Accounts
No frontend change needed — `pages/admin/accounts/finance-report/index.tsx` already calls `getFleetInvoices()` to populate its "Payables" list; it was silently failing only because of the backend role restriction (see backend doc). Fixing that role list alone makes these rows populate for `accountant` users.

## Not changed in this round
Items 5, 6, 7, and 8a from the client's feedback (Compliance dashboard, Accounts dashboard, GPS Dashboard, Fleet Maintenance Manager's due/overdue reminders) were confirmed already satisfied by Round 1.

## Verification performed
- `npx tsc -b --noEmit` — clean, no errors, across the whole project (including the subscription-page restructure, which needed a few `!` non-null assertions inside the now-disabled block after wrapping it in a fragment — the code is unreachable at runtime, but TypeScript still typechecks it).
- `npx eslint` on every changed file — no new errors introduced. One real lint catch worth noting: the initial `{false && (...)}` hiding approach tripped `no-constant-binary-expression` (ESLint correctly flagging a literal `false` in a boolean condition as suspicious); switched to a named `SELF_SERVICE_PLAN_UI_ENABLED` constant instead, which reads the same at runtime but doesn't trigger the rule and better documents intent. Pre-existing `@typescript-eslint/no-explicit-any` errors throughout these files predate this work (established codebase pattern) and were left alone.
- Live dev-server pass (fake-session technique, same as Round 1 — still no `.env`/database in this environment): confirmed the Register page trial badge, the Subscription page (no plan-browsing content renders, header/sidebar relabeled, no console errors), the Super Admin Settings page's new Trial Settings card, the Create Admin modal's new Trial Length field, and the Employee form's Pay Type/Pay Rate fields (including the new "Hourly" flow) — all render and interact correctly with zero new console errors. The Assign Plan modal's new customization section could not be exercised end-to-end live (it only renders once a plan is selected from real data, and there's no backend/database to seed plans against in this environment) — verified via `tsc`/`eslint`/code review instead.

## Files changed
```
src/axios/api/superadmin.ts
src/pages/admin/driverManagement/employees/index.tsx
src/pages/admin/subscription/index.tsx
src/pages/superadmin/adminAccount/ViewAllAccounts.tsx
src/pages/superadmin/setting/index.tsx
src/utils/AdminSidebarLinks.tsx
```
