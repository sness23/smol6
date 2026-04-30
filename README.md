# 🧬 Smol - Molecular Viewer Desktop App

[![Electron](https://img.shields.io/badge/Electron-30.0-blue?logo=electron)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.1-646CFF?logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)

> 🔬 A beautiful desktop application for molecular visualization powered by Mol* with a PyMOL-style command console

![Version](https://img.shields.io/badge/version-1.0.0-green)

---

## ✨ What is Smol?

**Smol** is an Electron-based desktop application that brings the power of the [Mol*](https://molstar.org/) molecular viewer to your desktop with an integrated PyMOL-style command console. Visualize protein structures, explore molecular data, and interact with your molecules using familiar command-line syntax! 🧪

### 🎯 Key Features

- 🖥️ **Native Desktop App** - Built with Electron for a seamless cross-platform experience
- 🎨 **3D Molecular Visualization** - Powered by the industry-leading Mol* viewer
- ⌨️ **PyMOL-Style Console** - Familiar command-line interface for power users
- 🚀 **Fast & Modern** - Built with Vite for lightning-fast development and builds
- 🔍 **300% Zoom** - Optimized default zoom for better visibility
- 🎭 **Clean Interface** - No menu bars, just pure molecular visualization

---

## 📦 Installation

### Prerequisites

Before you begin, ensure you have the following installed:

- 📌 **Node.js** (v18 or higher recommended)
- 📌 **npm** (comes with Node.js)
- 📌 **Git** (for cloning the repository)

### Clone the Repository

```bash
git clone <repository-url>
cd smol5
```

### Install Dependencies

```bash
npm install
```

---

## 🚀 Quick Start

### Development Mode

Start the development server with hot module replacement (HMR):

```bash
npm run dev
```

This will:
- ⚡ Launch Vite dev server
- 🔄 Enable hot reload for instant updates
- 🖥️ Open the Electron app automatically

### Build for Production

Create a production build with platform-specific installers:

```bash
npm run build
```

This command performs three sequential steps:
1. 📝 **TypeScript compilation** (`tsc`)
2. 📦 **Vite bundle creation** (`vite build`)
3. 🎁 **Electron app packaging** (`electron-builder`)

Built applications are output to `release/${version}/` with installers for:
- 🍎 **macOS**: DMG installer
- 🪟 **Windows**: NSIS installer (x64)
- 🐧 **Linux**: AppImage

### Preview Production Build

Preview the production build before packaging:

```bash
npm run preview
```

### Code Quality

Run the TypeScript linter to check for code quality issues:

```bash
npm run lint
```

---

## ⌨️ Console Commands

The smol viewer includes a powerful PyMOL-style console! 🎮

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **F2** | Toggle console visibility |
| **Enter** | Show console (when hidden) |
| **Escape** | Hide console |
| **↑ / ↓** | Navigate command history |

### Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `load <pdbid>` | Load a PDB structure from RCSB | `load 1crn` |
| `color <color>` | Color atoms (supports selections) | `color red @CA` |
| `close` | Clear all loaded structures | `close` |
| `help` | Show help information | `help` |

#### Selection Syntax Examples

- `@CA` - Select alpha carbons (`@` = atom name)
- `/A` - Select chain A (`/` = chain — **not** `:`, which is residue in ChimeraX)
- `#1` - Select model/structure with ID 1 (`#` = model)
- `color blue /A & @CA` - Color chain A alpha carbons blue (`&` = intersection)

---

## 🏗️ Project Architecture

### Three-Process Model

Smol follows Electron's standard architecture with three distinct processes:

```
┌─────────────────────────────────────────────────────────┐
│  🖥️  Main Process (electron/main.ts)                    │
│  • Manages application lifecycle                        │
│  • Creates browser windows                              │
│  • Handles system-level operations                      │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────▼──────────────────┐    ┌──────────────▼─────────┐
│  🔌 Preload Script       │    │  🎨 Renderer Process   │
│  (electron/preload.ts)   │    │  (index.html + smol/)  │
│  • IPC bridge layer      │    │  • Mol* viewer         │
│  • Security boundary     │    │  • 3D visualization    │
└──────────────────────────┘    │  • Command console     │
                                └────────────────────────┘
```

### Directory Structure

```
smol5/
├── 📂 electron/          # Electron main & preload scripts
├── 📂 public/            # Static assets
│   └── 📂 smol/         # Pre-built Mol* viewer files
│       ├── molstar.js   # Bundled viewer (9MB)
│       ├── molstar.css  # Viewer styles
│       └── images/      # Viewer assets
├── 📂 dist/             # Compiled renderer output
├── 📂 dist-electron/    # Compiled main process output
└── 📂 release/          # Platform-specific installers
```

---

## 🔄 Updating the Smol Viewer

The smol viewer is integrated from the molstar repository. To update:

### 1️⃣ Build in molstar repository

```bash
cd ../molstar
npm run build:apps  # or npm run dev:smol for development build
```

### 2️⃣ Copy updated files

```bash
cd ../smol5
cp ../molstar/build/smol/molstar.js public/smol/
cp ../molstar/build/smol/molstar.css public/smol/
cp ../molstar/build/smol/favicon.ico public/smol/
cp -r ../molstar/build/smol/images public/smol/
```

### 3️⃣ Restart development server

```bash
npm run dev
```

---

## 🛠️ Tech Stack

- **Electron** 🔷 - Cross-platform desktop framework
- **Vite** ⚡ - Next-generation frontend tooling
- **TypeScript** 📘 - Type-safe JavaScript
- **Mol*** 🧬 - Modern molecular visualization library

---

## ⚙️ Configuration

### TypeScript

The project uses two TypeScript configurations:
- `tsconfig.json` - Main config for `src/` and `electron/` with React JSX support
- `tsconfig.node.json` - Separate config for Vite configuration files

Strict mode is enabled with additional linting rules! 📏

### Electron Builder

Configure app metadata in `electron-builder.json5`:
- App ID
- Product name
- Platform-specific options
- Installer configurations

---

## 📝 Notes

- 🎨 React dependencies are kept for Vite plugin compatibility (the app doesn't use React directly)
- 📦 Vite config includes increased chunk size limits (10MB) for the large molstar.js file
- 🔧 Chrome's zoom shortcuts (Ctrl+=/Ctrl+-) work natively for page zoom
- 🖥️ The menu bar is hidden by default for a cleaner interface
- 🔍 Default zoom is set to 300% for better visibility

---

## 🐛 Known Issues

- 🐧 D-Bus errors on Linux are harmless and can be ignored
- ⌨️ Chrome zoom shortcuts cannot be overridden (by design)

---

## 📄 License

This project is based on Mol*, which is licensed under the MIT License.

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- 🐛 Report bugs
- 💡 Suggest features
- 🔧 Submit pull requests

---

## 🙏 Acknowledgments

Built with ❤️ using:
- [Mol*](https://molstar.org/) - The amazing molecular visualization toolkit
- [Electron](https://www.electronjs.org/) - For making desktop apps with web technologies
- [Vite](https://vitejs.dev/) - For blazing fast builds

---

<div align="center">

**Made with 🧬 for molecular scientists**

[⬆ Back to Top](#-smol---molecular-viewer-desktop-app)

</div>
