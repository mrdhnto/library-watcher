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
- 🎨 **Dark Mode** — Built-in light/dark theme toggle via Nuxt UI.
- ⌨️ **UX Polish** — Escape key to close modals (with back-navigation from delete confirm), right-click context menus, copy-path-to-clipboard, open-file-in-explorer integration.

## 🛠️ Technical Stack

- **Framework:** [Nuxt 4](https://nuxt.com) (Vue.js 3 + Nitro server engine)
- **UI Library:** [Nuxt UI](https://ui.nuxt.com) & [Lucide Icons](https://lucide.dev)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com)
- **Database:** [Better SQLite3](https://github.com/WiseLibs/better-sqlite3) with indexes on `files(hash)` and `files(filename)`
- **Backend:** H3 endpoints with SQLite

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

## 🤝 Open Source & Contributions

This project is **open-source**. Contributions, issues, and feature ideas are all welcome.

- Found a bug? Open an [Issue](https://github.com/Mrdhnto/library-watcher/issues).
- Have a feature idea? Start a [Discussion](https://github.com/Mrdhnto/library-watcher/discussions).
- Want to contribute code? Submit a [Pull Request](https://github.com/Mrdhnto/library-watcher/pulls).

---

Built with ❤️ by [Mrdhnto](https://github.com/Mrdhnto)
