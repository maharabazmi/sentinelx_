# SentinelX Testing

This folder contains the Selenium browser smoke suite, an Excel test-case sheet, and a PDF test report. The suite only inspects public UI behavior. It does not submit authentication, registration, complaint, emergency, or other data-changing forms.

## Run

From the repository root, install the isolated testing dependencies:

```powershell
python -m pip install -r _testing/requirements.txt
bun install
```

Start the frontend in one terminal:

```powershell
bun run dev -- --host 127.0.0.1
```

Run the suite from another terminal:

```powershell
python _testing/test_scripts/run_selenium_tests.py
```

The runner defaults to headless Chrome at `http://127.0.0.1:3000`. Selenium Manager may download a compatible browser driver on first use. Set `$env:SENTINELX_BROWSER = "edge"` for Edge, `$env:SENTINELX_BASE_URL` for another frontend URL, or `$env:SENTINELX_HEADLESS = "false"` to show the browser.

Each run overwrites `test_cases.xlsx` and `test_report.pdf` with actual pass/fail/error results. A browser startup or server connection error is reported as an execution error, not a pass.

## Scope

The five automated cases cover landing-page rendering, emergency hotline links, login dialog/password visibility, opening the NID registration wizard, and the theme toggle. Authentication success, backend/database behavior, registration submission, role-specific dashboards, and external integrations are not covered and should be tested separately in an isolated test environment.

See [bug_feedback_report.md](bug_feedback_report.md) for current findings and follow-up coverage notes.
