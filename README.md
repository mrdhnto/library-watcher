# 🔍 Library Watcher

[![Nuxt](https://img.shields.io/badge/Nuxt-4.3.1-00DC82?logo=nuxt.js&logoColor=white)](https://nuxt.com)
[![Nuxt UI](https://img.shields.io/badge/Nuxt%20UI-4.4.0-00DC82?logo=nuxt.js&logoColor=white)](https://ui.nuxt.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.1.18-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/SQLite-Better--SQLite3-003B57?logo=sqlite&logoColor=white)](https://github.com/WiseLibs/better-sqlite3)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Library Watcher** is a centralizing indexing and tracking system for studio environments where media assets, projects, and source files are scattered across multiple disks and storage devices.

## 🚀 The Goal

In a professional studio setting, resources are frequently fragmented. **Library Watcher** provides a single unified interface to:
- **Index & Track** — Scan multiple disks and directories to build a centralized SQLite database of all your assets.
- **Browse by Folder** — Navigate scanned files using an explorer-style tree view with breadcrumbs, infinite scroll, search, sort, and right-click context menus.
- **Detect Duplicates** — Identify identical files via SHA-256 hashing with per-file counts, matching filenames, and aggregated waste statistics.
- **Manage Metadata** — Mark files as uploaded or deleted (soft delete) with bulk operations and per-file action modals (open location, copy path, upload, hide).
- **Search Globally** — Search across the entire library by filename, filepath, or hash from a dedicated search page with paginated results.
- **Monitor Scans** — Track background scanning jobs with real-time progress bars, status badges, ETA, and duplicate reporting.

## ✨ Features

- 🖥️ **Dashboard** — Real-time stats: total files, storage size, uploaded count, duplicates found, and wasted space. Quick-action links to all major pages.
- 📂 **Explorer Mode** — Folder-tree browser with volume detection, breadcrumb navigation, search + sort + duplicates-only filter, file type icons (80+ extension-to-icon mappings), New/Dup badges, right-click context menu (upload, copy path, open location, details, delete), infinite scroll (25 files per page), and animated action modal with inline delete confirmation.
- 🔍 **Global Search** — Dedicated `/search` page with full-text search across filename, filepath, and SHA-256 hash, paginated results with file type icons and duplicate badges.
- 📋 **Files Table** — Paginated, searchable table with duplicate-only filter, multi-select bulk actions (mark uploaded/deleted with optional disk deletion), and "scan & match" modal for batch folder operations.
- ⚡ **Background Scanning** — Non-blocking scan jobs with SHA-256 hashing, duplicate detection, progress tracking (scanning_dir → hashing → completed), and job termination.
- 📊 **Job Queue** — Active job progress with status badges, progress bars, inline duplicate lists, ETA display. Searchable scan history with detail modals, error messages, and pagination.
- 🌐 **Remote Clients** — Connect external machines via WebSocket with token-based auth. Dispatch scans to remote clients from the web UI — clients scan locally and stream results back.
- 📋 **Client Management** — Dedicated `/clients` page to view connected clients (hostname, IP, status), rename aliases, kick clients, and manage one-time-use auth tokens.
- 🎨 **Dark Mode** — Built-in light/dark theme toggle via Nuxt UI.
- ⌨️ **UX Polish** — Escape key to close modals (with back-navigation from delete confirm), right-click context menus, copy-path-to-clipboard, open-file-in-explorer integration.

## 🛠️ Technical Stack

- **Framework:** [Nuxt 4](https://nuxt.com) (Vue.js 3 + Nitro server engine)
- **UI Library:** [Nuxt UI](https://ui.nuxt.com) & [Lucide Icons](https://lucide.dev)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com)
- **Database:** [Better SQLite3](https://github.com/WiseLibs/better-sqlite3) with indexes on `files(hash)` and `files(filename)`
- **Backend:** H3 endpoints with SQLite
- **WebSocket:** CrossWS (H3) for real-time remote client communication
- **Client CLI:** Standalone Node.js app ([`client-app/`](client-app/)) using `ws` + `commander`

## 🏁 Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- pnpm (Recommended)

### Installation
```bash
git clone https://github.com/Mrdhnto/library-watcher.git
cd library-watcher
pnpm install
```

### Development
```bash
pnpm dev
```

### Production
```bash
pnpm build
pnpm preview
```

## 🌐 Remote Clients

Library Watcher is **self-hosted** — you run the server on your own machine or studio server.
Remote scanning lets you index machines that can't run the full web server — the server runs
centrally on your network, and each client machine connects to it via WebSocket.
Both the server and clients must have network connectivity to each other.

### How it works

1. **Generate a token** — In the web UI, go to Clients → Generate Token → copy the one-time token.
   > **Prerequisite:** Your Library Watcher server must be running and reachable from the client machine over your network.
2. **Connect a machine** — On the target machine, run:
   ```bash
   lw-client -u ws://your-server:8080/api/client/ws -t <token>
   ```
3. **Token is claimed** — The first machine that connects with that token claims it (bound by hostname).
   That same machine can always reconnect, even after reboots:
   ```bash
   lw-client connect
   ```
4. **Scan remotely** — In the web UI, go to Scan → switch to "Remote Client" → pick the client → enter path.
   The client scans the directory locally, hashes files, and streams results back to the server.

### Token lifecycle

| State | Meaning |
|-------|---------|
| **Unclaimed** | Never used. Available for first client. |
| **Claimed** | Bound to a specific hostname. Only that PC can use it. |
| **Revoked** | Admin disabled the token. Client can no longer connect. |

- Tokens are **one-time-use**: first hostname to connect owns it.
- A different PC cannot use a claimed token — generate a new one.
- Revoke a token from the Clients page to free it.

### Client CLI

The client is in the [`lw-client`](https://github.com/Mrdhnto/lw-client) standalone repo. Requires only Node.js — no database or web server dependencies.

```bash
# Install globally
npm install -g git+https://github.com/mrdhnto/lw-client.git

# First-time setup
lw-client -u ws://your-server:8080/api/client/ws -t <token>

# Reconnect after restart
lw-client connect

# Run without installing
npx github:mrdhnto/lw-client -u <url> -t <token>
```

#### Options

| Flag | Alias | Description |
|------|-------|-------------|
| `--url <url>` | `-u` | WebSocket server URL |
| `--token <token>` | `-t` | Authentication token |

#### Commands

| Command | Description |
|---------|-------------|
| `connect` | Reconnect using saved configuration (`~/.lw-client.json`)

### API endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/clients` | List all clients with connection status |
| `POST` | `/api/clients/:id/rename` | Change client display alias |
| `POST` | `/api/clients/:id/kick` | Disconnect and kick a client |
| `GET` | `/api/clients/tokens` | List auth tokens |
| `POST` | `/api/clients/tokens` | Generate a new token |
| `DELETE` | `/api/clients/tokens/:id` | Revoke a token |
| `WS` | `/api/client/ws` | WebSocket endpoint for remote clients |

## 🤝 Open Source & Contributions

This project is **open-source**. Contributions, issues, and feature ideas are all welcome.

- Found a bug? Open an [Issue](https://github.com/Mrdhnto/library-watcher/issues).
- Have a feature idea? Start a [Discussion](https://github.com/Mrdhnto/library-watcher/discussions).
- Want to contribute code? Submit a [Pull Request](https://github.com/Mrdhnto/library-watcher/pulls).

---

Built with ❤️ by [Mrdhnto](https://github.com/Mrdhnto)
