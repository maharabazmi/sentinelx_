# SentinelX Testing

This folder contains a combined Selenium UI and Flask API contract suite, an Excel test-case sheet, and a PDF test report. Browser tests inspect public UI behavior without submitting forms. API tests use a temporary SQLite database that is removed after the run; they do not use the configured application database.

## Run

From the repository root, install the isolated testing dependencies:

```powershell
python -m pip install -r _testing/requirements.txt
python -m pip install -r requirements.txt
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

Each run overwrites `test_cases.xlsx`, `test_report.pdf`, and `test_results.md` with actual pass/fail/error results. A browser startup or server connection error is reported as an execution error, not a pass.

GitHub does not render PDF or Excel file contents in a pull-request diff; it may display “Binary file not shown”. This is expected for those formats. Open [test_results.md](test_results.md) to review every case and its result directly in GitHub, or download the PDF and workbook for the formatted reports.

## Scope

The 12 automated cases cover five public UI behaviors plus NID verification validation, valid/registered NID checks, successful and rejected citizen login, and the public admin-login security block. Test records exist only in a unique temporary SQLite database that is deleted after the run. Registration submission, role-specific dashboard workflows, case creation, notifications, and external integrations need separate tests in an isolated environment.

See [bug_feedback_report.md](bug_feedback_report.md) for current findings and follow-up coverage notes.
