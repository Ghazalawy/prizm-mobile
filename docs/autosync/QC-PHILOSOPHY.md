# QC philosophy — prizm-mobile

The mobile app is updated every week with no human reviewer in the loop. That
only works if "green" means the app works. These rules exist because each one
was violated once and shipped a broken screen to staff.

## Principles

1. **Test the path the user takes, not the code you changed.** A notification
   is tapped in the bell, in the approvals inbox and from an e-mail link. Each
   path is tested separately (`test-deeplink-wiring`), because each broke
   separately.
2. **The backend is the source of truth, read fresh every run.** Gates read the
   PrizmIT/prizm331 source at a pinned commit, never a hand-kept list. If the
   backend adds a notification link, the gate knows the same day.
3. **A route that opens *something* is not a pass.** It must open the right
   screen, for the right record, from the right table. "Landed on the ERP home
   grid" and "opened record #1 instead of #48213" are failures.
4. **Never guess a mapping. Read the web controller.** (READ-WEB-FIRST in
   CLAUDE.md.) Every record link is pinned to its screen in
   `qc/record-link-contracts.json`, with evidence naming the web model's table
   and the mobile endpoint's table.
5. **Fail closed.** A missing secret, a missing backend checkout or an
   extractor that finds nothing is a failure, never a skip.
6. **Ratchet, don't reset.** Known gaps live in baselines that may only shrink.
   A fixed gap still listed fails the gate, so the baseline tracks reality.
7. **Separation of duties.** The weekly loop (`autosync/*` branches) may add
   features and tests. It may not edit gates or workflows, delete assertions,
   or add baseline entries without moving the backend pin and giving a reason.
8. **Evidence, not claims.** `tsc` passing is not QC. Every gate prints what it
   checked and counts it. CI artifacts keep the evidence.

## Gate inventory

| Gate (CI check) | What it proves | Incident that created it |
|---|---|---|
| Expo dependency matrix | Native deps match the Expo SDK | CI broken for weeks by silent drift (May 2026) |
| TypeScript | The app compiles | — |
| Unit & routing regressions | Biometric policy; every routing bug fixed so far stays fixed (no backend needed) | v1.14 fingerprint dead end; Oct 2026 routing defects |
| Release metadata & version bump | A user-facing change ships as a new version with a new What's New entry | APKs that showed the previous version's notes |
| QC integrity (ratchet) | Baselines only shrink; contracts need evidence; autosync cannot touch gates | — (protects the unattended loop from itself) |
| Backend contracts & deeplink wiring | Every backend notification/approval link opens the correct native screen through all three paths; CRUD/list/filter/sort endpoints exist in the backend | Leave approvals, delivery notes, received vouchers opening the ERP home; `materials/Items` opening `tblmaterials` rows; legacy RFQ links opening RFQ #1 |
| Live API smoke (read-only) | Every item the QA account can tap opens with data; every module lists a record and opens it | Payment Request "not found" on mobile while the web worked (model joined an unprefixed table) |
| Signer verification | The APK is signed with the certificate in `assetlinks.json` | — (an APK with another key can't update installed apps and breaks App Links) |
| Emulator smoke | The exact APK installs, cold-starts, claims 5 production App Links, no native crash | — |

The release workflow runs **all** of them on the exact commit before
publishing. Branch protection is not required for that guarantee: nothing is
published unless the gates pass.

## Deeplink failure codes

| Code | Meaning for the user |
|---|---|
| `NO_NATIVE_ROUTE` | Tapping lands on the ERP home grid with "no exact native screen" |
| `ERP_HOME_FALLBACK` | App Link opens the ERP home grid |
| `RECORD_ID_LOST` | Opens a list, or the wrong record |
| `UNKNOWN_MODULE` | Opens "Module not found" |
| `NO_DETAIL_VIEW` | Record link into a module without a detail screen |
| `NON_CANONICAL` | Opens the generic field list although a dedicated screen (with actions) exists |
| `GENERIC_GUESS` | Resolved only by the controller-name heuristic; the id may belong to another table |
| `NO_DEEPLINK` | Inbox item does nothing when tapped |
| `UNVERIFIED_RECORD_LINK` / `MAPPING_CHANGED` | Record link not pinned to a verified screen, or moved away from it |

## Known limits (stated, not hidden)

- **Runtime-only links.** About 46 backend link sites build the link from a
  variable (`'link' => $link`). Static analysis cannot see them. The live smoke
  covers the ones that reach the QA account's inbox.
- **Table identity.** The gate proves the id survives and the screen is the
  pinned one. Whether the pinned screen reads the same table as the web is
  established when the contract is written (evidence field). 25 contracts were
  recorded at introduction as "not re-verified". Each weekly run should verify
  a few and rewrite their evidence.
- **Screen content.** No gate renders React screens with real data yet. The
  live smoke proves the data endpoint returns a non-empty record. A UI-level
  test (Maestro / RN Testing Library with recorded fixtures) is the next step.
- **QA account scope.** The live smoke sees what the QA account may see.
  Modules forbidden to that account are reported, not tested.
