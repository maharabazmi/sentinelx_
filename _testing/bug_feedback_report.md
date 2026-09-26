# Bug / Feedback Report

**Project:** SentinelX  
**Suite:** Selenium public-UI smoke tests  
**Report date:** 2026-09-26

## Confirmed defects

No application defect is claimed by this test contribution. The automated suite reports defects only when an assertion fails; `test_report.pdf` records the latest run.

## Coverage feedback

| Priority | Feedback | Follow-up |
| --- | --- | --- |
| Medium | Current browser checks intentionally stop before submitting forms, so they do not verify API, database, authorization, or role-dashboard behavior. | Add authenticated workflow tests against a dedicated disposable test database and non-production accounts. |
| Low | External NID, email, mapping, and AI integrations are not exercised by this read-only UI smoke suite. | Test integrations with documented mocks/stubs or an approved staging environment. |

## Safe test data

The suite uses only the public landing page and opens client-side dialogs. It does not log in, register users, send OTPs, create cases, or dispatch SOS alerts. Do not add write-flow browser tests against a shared or production database.
