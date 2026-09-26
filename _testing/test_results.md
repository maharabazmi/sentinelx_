# SentinelX Automated Test Results

- Run started: 2026-09-26T18:33:21 UTC
- UI target: `http://127.0.0.1:3000`
- Browser: `chrome`
- API database: temporary SQLite, deleted after the run
- Summary: **12 executed, 12 passed, 0 failed, 0 errors, 0 skipped**
- Scope: public UI smoke checks and authentication/NID API contracts; no shared or production database is used.

| ID | Module | Test case | Expected result | Actual result | Status | Defect / feedback |
| --- | --- | --- | --- | --- | --- | --- |
| UI-001 | Public landing | Landing page renders its public safety content | The public defense heading and official sign-in action are visible. | PASS | PASS |  |
| UI-002 | Emergency hotline | Hotline menu shows Bangladesh emergency contacts | The menu shows 999, 16121, 109, and 333. | PASS | PASS |  |
| UI-003 | Authentication UI | Login modal opens and password visibility toggles | The login dialog opens and the password input toggles text/password types. | PASS | PASS |  |
| UI-004 | Registration UI | NID registration wizard opens from the landing page | The registration wizard's identity-verification step is visible. | PASS | PASS |  |
| UI-005 | Display settings | Theme control switches between light and dark | The control changes from Switch to light theme to Switch to dark theme or vice versa. | PASS | PASS |  |
| API-001 | NID API | NID verification rejects a missing payload | HTTP 400 with a validation error; no records are created. | PASS | PASS |  |
| API-002 | NID API | NID verification rejects an invalid NID format | HTTP 400 with an NID format validation error. | PASS | PASS |  |
| API-003 | NID API | NID verification accepts a valid unregistered mock NID | HTTP 200, verified identity data, and alreadyRegistered=false. | PASS | PASS |  |
| API-004 | NID API | NID verification detects an existing seeded account | HTTP 200 and alreadyRegistered=true. | PASS | PASS |  |
| API-005 | Authentication API | Login accepts valid seeded citizen credentials | HTTP 200, success=true, a token, and a citizen user profile. | PASS | PASS |  |
| API-006 | Authentication API | Login rejects an incorrect password | HTTP 401 with a credential error and no authentication token. | PASS | PASS |  |
| API-007 | Authentication API | Public login blocks an administrator account | HTTP 403 with an access-denied response. | PASS | PASS |  |
