# Auto Login

Auto Login is a Windows desktop app built with Electron, React, Vite, and SQLite for managing website account records and opening login pages in the system default browser.

## Features

- Manage site records with account, password, URL, notes, and grouping data
- Import and export site data with Excel
- Organize sites with custom groups and a sidebar group tree
- Search, paginate, and batch open login pages
- Add and edit sites manually from the desktop UI
- Encrypt locally stored passwords
- Build Windows directory, installer, and portable editions

## Tech Stack

- Electron
- React
- Vite
- SQLite

## Project Structure

- `src/main`: Electron main process, IPC, database, Excel, settings, browser launch
- `src/preload`: secure renderer bridge
- `src/renderer`: React UI
- `src/shared`: shared site rules and helpers
- `tests`: automated tests
- `release`: generated Windows build artifacts

## Development

Install dependencies:

```bash
nvm use 22
npm install
```

Use Node.js 22 LTS for development and release builds. The CI workflow enforces the same major version.

Run in development mode:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Build the renderer:

```bash
npm run build
```

Build Windows packages:

```bash
npm run pack:win
```

## Playwright Browser Automation

This project now includes a standalone Playwright login workflow runner at `scripts/playwright-login.mjs`.
It uses the same core fields already stored by the app: `loginUrl`, `username`, `password`, `usernameSelector`, `passwordSelector`, and `submitSelector`.

Install Playwright first:

```bash
npm install -D playwright
npx playwright install chromium
```

Run the included example against the local mock login page:

```bash
npm run playwright:login:example
```

Run a real workflow config:

```bash
npm run playwright:login -- --config path/to/login-workflow.json
```

Open a visible browser window while debugging:

```bash
npm run playwright:login -- --config path/to/login-workflow.json --headed
```

Optional custom artifact directory:

```bash
npm run playwright:login -- --config path/to/login-workflow.json --output-dir output/playwright/my-run
```

### Config format

Example config:

```json
{
  "browserName": "chromium",
  "defaultTimeoutMs": 15000,
  "submitWaitMs": 1500,
  "postSubmitSelector": ".dashboard",
  "postSubmitUrlIncludes": "/home",
  "workflows": [
    {
      "name": "crm-portal",
      "loginUrl": "https://crm.example.com/login",
      "username": "alice@example.com",
      "password": "secret123",
      "usernameSelector": "#username",
      "passwordSelector": "#password",
      "submitSelector": "button[type='submit']",
      "beforeFillWaitForSelector": "#username",
      "postSubmitSelector": ".welcome-banner",
      "successMessage": "CRM login submitted successfully."
    }
  ]
}
```

### Run steps

1. Install Playwright and browser binaries.
2. Copy `scripts/playwright-login.example.json` and replace the URL, credentials, and selectors with real values.
3. Add `postSubmitSelector` or `postSubmitUrlIncludes` for stronger success detection when the target site redirects after login.
4. Run `npm run playwright:login -- --config <your-config>`.
5. Review `output/playwright/login-results.json` and any success or failure screenshots.

### Reliability notes

- The script validates required fields before launching the browser.
- It classifies errors into `validation_error`, `selector_not_found`, `page_load_error`, and `unknown_error`.
- It writes a machine-readable summary file plus screenshots for easier troubleshooting.
- If a site needs an already-authenticated browser state, add `storageStatePath` to the config and point it at a Playwright storage state JSON file.

## Windows Outputs

After `npm run pack:win`, the main outputs are generated in `release`:

- `win-unpacked/`: directory edition
- `Auto Login Setup-<version>.exe`: installer edition
- `Auto Login Portable-<version>.exe`: portable edition

Generated installers are intentionally ignored by Git. Publish them through a version tag (`vX.Y.Z`): GitHub Actions validates lint, tests, build, production dependency audit and secret scanning, then creates a GitHub Release from the Windows artifacts.

## Quality and security checks

```bash
npm run lint
npm test
npm run build
npm audit --audit-level=high
```

- This application has no required environment variables or cloud service configuration.
- Do not commit real credentials, database files, generated Excel exports, Playwright screenshots, or Windows installers.
- Passwords are encrypted locally. See [SECURITY.md](SECURITY.md) for the supported threat model and vulnerability reporting process.
- Before a public Windows release, configure code signing outside the repository with GitHub Secrets; unsigned packages can trigger Windows reputation warnings.

## Release checklist

1. Run the quality and security checks above.
2. Manually verify add, edit, import, export, group move and browser launch flows with non-production credentials.
3. Back up the local SQLite data directory before upgrading an existing installation.
4. Update `CHANGELOG.md`, create a `vX.Y.Z` tag, and push the tag.
5. Confirm the generated GitHub Release assets and retain the prior installer for rollback.

For Node.js requirements, Windows package commands and network troubleshooting, see [BUILDING.md](BUILDING.md).

## Notes

- The app currently opens login pages in the system default browser.
- The `release` folder in the repository is different from GitHub's "Releases" section. GitHub Releases must be published separately on GitHub.
