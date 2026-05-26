# QC Framework — prizm-mobile

## Golden Rule
> **Don't ship without testing. Mobile result MUST match web result identically.**

## Testing Environments

| Environment | URL | DB | Purpose |
|-------------|-----|-----|---------|
| **Dev** | `https://ms.prizm-energy.com/ms_dev/` | `prizmene_dev` | Safe testing, no production pollution |
| **Prod** | `https://ms.prizm-energy.com/MS/` | `prizmene_MS` | Only after dev test passes |

## Per-Module QC Checklist

Every module feature MUST pass all gates before shipping:

### Gate 1: API Endpoint Health
- [ ] GET list returns 200 with correct data shape
- [ ] GET detail returns 200 with all fields
- [ ] POST create returns 201 and record appears in web
- [ ] PUT update returns 200 and changes reflect in web
- [ ] DELETE returns 200 and record removed from web
- [ ] Each mutation is logged in `tblactivity_log` with `[Mobile]` prefix

### Gate 2: Permission Compliance
- [ ] Non-logged-in → 401
- [ ] Staff without view permission → 403
- [ ] Staff without create permission → 403 on POST
- [ ] Staff without edit permission → 403 on PUT
- [ ] Staff without delete permission → 403 on DELETE
- [ ] View-As (impersonation) respects impersonated staff's permissions

### Gate 3: Data Integrity
- [ ] Created record identical to web-created record (all fields)
- [ ] Updated record matches web-updated record
- [ ] Deleted record gone from both mobile and web
- [ ] Custom fields persist correctly
- [ ] Attachments upload/download correctly

### Gate 4: Counters & Badges
- [ ] Module list count matches web list count
- [ ] Approval badge count matches web header count
- [ ] Filtered counts match web filtered counts
- [ ] Dashboard tile counts match web dashboard

### Gate 5: Workflow / Actions
- [ ] Each action button appears only when web would show it
- [ ] Each action produces same result as web (same status change, same log entry)
- [ ] Approval chain visible matches web
- [ ] Rejection note mandatory where web requires it

### Gate 6: Sub-resources (children)
- [ ] Checklist items: create, check, uncheck, delete, reorder
- [ ] Comments: create, edit, delete
- [ ] Attachments: upload, preview, download, delete
- [ ] Assignees/Followers: add, remove
- [ ] All child mutations log to activity

### Gate 7: UI Parity
- [ ] Required fields marked/validated same as web
- [ ] Disabled fields match web conditions
- [ ] Dropdown options match web
- [ ] Date pickers match web format
- [ ] Currency/Number formatting matches web

## Test Data Policy
- **NEVER test on production data first**
- **Use dev environment** (`prizmene_dev`) for all initial testing
- Create test records with `[QC-TEST]` prefix for easy cleanup
- After dev passes, spot-check on production with low-risk records

## Regression Check
After ANY change to a module, re-run Gate 1-7 for that module before shipping.
