# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron desktop application that integrates the **smol** molecular viewer (a Mol* variant with PyMOL-style console). The project uses Vite for building and `vite-plugin-electron` for Electron integration.

## Architecture

### Three-Process Model

The application follows Electron's standard architecture with three distinct processes:

1. **Main Process** (`electron/main.ts`): Node.js environment that manages the application lifecycle, creates browser windows, and handles system-level operations. Entry point defined in `vite.config.ts`.

2. **Preload Script** (`electron/preload.ts`): Bridge layer that exposes controlled IPC APIs to the renderer process via `contextBridge`. This maintains security by limiting renderer access to Electron/Node.js APIs.

3. **Renderer Process** (`index.html` + `public/smol/`): The smol molecular viewer running in Chromium. The viewer provides a 3D visualization canvas with an integrated command console.

### Smol Viewer Integration

The app integrates the pre-built smol viewer from `../molstar/build/smol/`:

- **molstar.js** (9MB): Bundled Mol* viewer with console functionality
- **molstar.css**: Viewer styles
- **favicon.ico**: App icon
- **images/**: Viewer assets

These files are copied to `public/smol/` and loaded directly in `index.html` without going through Vite's bundler.

### Build Output Structure

The build process creates two separate output directories:
- `dist/`: Compiled HTML and public assets (renderer process)
- `dist-electron/`: Compiled Electron code (main process and preload script)

### Console Features

The smol viewer includes a PyMOL-style console with:
- **F2**: Toggle console visibility
- **Enter**: Show console (when hidden)
- **Escape**: Hide console
- **Up/Down arrows**: Navigate command history
- Command history persistence via localStorage

Available console commands:
- `load <pdbid>`: Load PDB structure
- `color <color>`: Color atoms (supports selections like `@CA`, `:A`)
- `close`: Clear all structures
- `help`: Show help information

## Development Commands

```bash
# Start development server with HMR
npm run dev

# Run linter (checks TypeScript files for code quality issues)
npm run lint

# Full production build (compiles TypeScript, builds Vite bundle, and creates Electron distributables)
npm run build

# Preview production build
npm run preview
```

## Updating Smol Viewer

When the smol viewer is updated in the molstar repository:

1. Build smol in the molstar repository:
   ```bash
   cd ../molstar
   npm run build:apps  # or npm run dev:smol for development build
   ```

2. Copy updated files to this project:
   ```bash
   cd ../smol5
   cp ../molstar/build/smol/molstar.js ../molstar/build/smol/molstar.css ../molstar/build/smol/favicon.ico public/smol/
   cp -r ../molstar/build/smol/images public/smol/
   ```

3. Restart the development server:
   ```bash
   npm run dev
   ```

## Build and Distribution

The `npm run build` command performs three sequential steps:
1. TypeScript compilation (`tsc`)
2. Vite bundle creation (`vite build`)
3. Electron app packaging (`electron-builder`)

Built applications are output to `release/${version}/` with platform-specific installers:
- macOS: DMG installer
- Windows: NSIS installer (x64)
- Linux: AppImage

Configure app metadata in `electron-builder.json5` (currently uses placeholder `appId` and `productName`).

## TypeScript Configuration

The project uses two TypeScript configurations:
- `tsconfig.json`: Main config for `src/` and `electron/` directories with React JSX support
- `tsconfig.node.json`: Separate config for Vite configuration files

Strict mode is enabled with additional linting rules for unused locals and parameters.

## Notes

- React dependencies are kept in `package.json` for Vite plugin compatibility, but the app itself doesn't use React
- The Vite config includes increased chunk size limits (10MB) to accommodate the large molstar.js file
- D-Bus errors on Linux are harmless and can be ignored
