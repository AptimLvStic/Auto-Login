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
npm install
```

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

## Windows Outputs

After `npm run pack:win`, the main outputs are generated in `release`:

- `win-unpacked/`: directory edition
- `Auto Login Setup-0.1.0.exe`: installer edition
- `Auto Login Portable-0.1.0.exe`: portable edition

## Notes

- The app currently opens login pages in the system default browser.
- The `release` folder in the repository is different from GitHub's "Releases" section. GitHub Releases must be published separately on GitHub.
