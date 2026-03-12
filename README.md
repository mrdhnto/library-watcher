# 🔍 Library Watcher

[![Nuxt](https://img.shields.io/badge/Nuxt-4.3.1-00DC82?logo=nuxt.js&logoColor=white)](https://nuxt.com)
[![Nuxt UI](https://img.shields.io/badge/Nuxt%20UI-4.4.0-00DC82?logo=nuxt.js&logoColor=white)](https://ui.nuxt.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.1.18-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/SQLite-Better--SQLite3-003B57?logo=sqlite&logoColor=white)](https://github.com/WiseLibs/better-sqlite3)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Library Watcher** is a centralizing indexing and tracking system designed for studio environments where media assets, projects, and source files are often scattered across multiple disks and storage devices.

## 🚀 The Goal

In a professional studio setting, resources are frequently fragmented. **Library Watcher** aims to solve this by providing a single, unified interface to:
- **Index & Track:** Scan multiple disks and directories to create a centralized database of all your assets.
- **Centralize Metadata:** Mark and organize files regardless of their physical location on your "RIG".
- **Intelligent Detection:** Identify duplicate files using SHA-256 hashing to save space and maintain organization.
- **Monitor Progress:** Track background scanning jobs and resource usage through an intuitive dashboard.

## ✨ Features

- 🖥️ **Modern Dashboard:** Real-time overview of total files, storage size, and wasted space.
- 📂 **Flexible Scanning:** Add any directory path to the scan queue.
- ⚡ **Background Processing:** Multi-threaded scanning and hashing that doesn't block the UI.
- 🔍 **Duplicate Finder:** Automatic detection of identical files based on content, not just filenames.
- 📋 **Job Management:** Track the status of every scan, including progress and error reporting.
- 🎨 **Premium UI:** Built with Nuxt UI and Tailwind CSS for a sleek, responsive experience.

## 🛠️ Technical Stack

- **Framework:** [Nuxt 4](https://nuxt.com) (Vue.js 3)
- **UI Components:** [Nuxt UI](https://ui.nuxt.com) & [Lucide Icons](https://lucide.dev)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com)
- **Database:** [Better SQLite3](https://github.com/WiseLibs/better-sqlite3) for high-performance local storage
- **Backend:** Nuxt Server Engine (H3)

## 🏁 Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- pnpm (Recommended)

### Installation
```bash
# Clone the repository
git clone https://github.com/Mrdhnto/library-watcher.git

# Install dependencies
pnpm install
```

### Development
```bash
# Start the development server
pnpm dev
```

### Production
```bash
# Build the application
pnpm build

# Preview the build
pnpm preview
```

## 🤝 Open Source & Contributions

This project is **open-source** and I welcome anyone to use, modify, or improve it! Whether you're a fellow studio worker or a curious developer, your contributions are highly appreciated.

- Found a bug? Open an [Issue](https://github.com/Mrdhnto/library-watcher/issues).
- Have a feature idea? Start a [Discussion](https://github.com/Mrdhnto/library-watcher/discussions).
- Want to contribute code? Feel free to submit a [Pull Request](https://github.com/Mrdhnto/library-watcher/pulls).

---

Built with ❤️ by [Mrdhnto](https://github.com/Mrdhnto)
