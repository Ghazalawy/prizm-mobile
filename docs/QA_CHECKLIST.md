# QA Checklist — Pre-Push Validation

Run through this checklist before every push to `main`. Every item must pass.
Failures block the push until fixed.

---

## A. Build Health

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx expo export --platform android --no-minify` completes without crashes
- [ ] No new `console.error` or `console.warn` from app code (RN noise excluded)

## B. Authentication

- [ ] Fresh login with valid credentials → lands on Dashboard
- [ ] Biometric unlock works after app is backgrounded and resumed
- [ ] Invalid/expired token → redirects to login (not a crash)
- [ ] 403 from a permission-gated action does NOT sign the user out

## C. Dashboard

- [ ] All stat cards load with real numbers (not 0 or NaN)
- [ ] Quick-action buttons navigate to the correct screens
- [ ] Pull-to-refresh updates all cards
- [ ] "Customize" → reorder/hide cards → persists after app restart

## D. ERP Module Hub

- [ ] ERP tab shows all expected modules for an admin user
- [ ] Non-admin user sees only modules they have permissions for
- [ ] If permission API fails/times out, all modules still appear (degraded mode)
- [ ] Search filters modules by name

## E. Tasks

- [ ] Task list has no duplicate rows
- [ ] Kanban board shows tasks in correct status columns
- [ ] Create new task → appears in list immediately
- [ ] Open task detail → checklist items toggle (mark done/undone)
- [ ] Checklist add/delete/reorder works

## F. Projects

- [ ] Project detail shows all 9 tabs: Overview, Tasks, Milestones, Invoices, Tickets, Files, Notes, Activity, Expenses
- [ ] Files tab: upload from Camera/Gallery/File → file appears in list
- [ ] Uploaded files are visible on the web app (same `tblfiles` row)
- [ ] Files uploaded from web app appear in mobile Files tab

## G. Notifications (Action Center)

- [ ] Bell badge shows correct unread count
- [ ] Unread items have blue background; read items have white
- [ ] Tapping a task notification → navigates to native task detail screen
- [ ] Tapping a project notification → navigates to native project detail
- [ ] Tapping an invoice/estimate/ticket notification → navigates to native screen
- [ ] Only genuinely unsupported modules fall through to browser
- [ ] "Mark all read" clears all badges

## H. Financial Documents

- [ ] Invoice list loads; detail shows line items + totals
- [ ] Estimate list loads; detail shows content
- [ ] Proposal list loads; detail shows sections

## I. Changelog & What's New

- [ ] `CHANGELOG.json` top entry matches this build's actual changes
- [ ] `package.json` version matches `CHANGELOG.json` top entry version
- [ ] WhatsNewModal fires once on first launch after update (not on every build)
- [ ] Changelog screen in Settings shows full history

## J. Build Pipeline

- [ ] `concurrency.cancel-in-progress` is `true` in `build-and-deploy.yml`
- [ ] Push does not queue builds for commits that are already superseded

---

## How to Use

1. Before each push, copy this checklist into the PR body or a local note
2. Walk through each section on a real device or emulator
3. Mark each item pass/fail
4. If any item fails → fix before pushing
5. Record the QA run result (date, tester, pass/fail) in the PR description
