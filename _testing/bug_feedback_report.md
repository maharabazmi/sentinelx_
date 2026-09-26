# Bug / Feedback Report

**Project:** SentinelX  
**Suite:** Selenium UI smoke tests and Flask auth/NID API contract tests
**Report date:** 2026-09-27

## Confirmed defects

No application defect was observed in the latest run. All 12 included cases passed; `test_report.pdf` and `test_cases.xlsx` contain the detailed results. The suite reports assertion failures separately from setup/runtime errors.

## Coverage feedback

| Priority | Feedback | Follow-up |
| --- | --- | --- |
| Medium | Role-specific dashboard workflows, case submission, and notifications are not covered. | Add role-based workflows against a dedicated disposable database, with explicit cleanup and non-production accounts. |
| Low | Live NID, email, mapping, and AI integrations are not exercised; NID checks use the local mock service. | Test integrations with documented mocks/stubs or an approved staging environment. |

## Safe test data

Browser checks use public pages and client-side dialogs. API login tests use a seeded temporary SQLite database under the system temp directory, deleted after the suite. Tests do not register accounts, send OTPs, create cases, or dispatch SOS alerts. Do not run write-flow tests against a shared or production database.
