# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Tauri v2 desktop application using React 19 with TypeScript. Tauri enables building lightweight, secure desktop apps using web technologies as the frontend and Rust as the backend.

**Stack:**
- Frontend: React 19 + TypeScript + Vite
- Backend: Rust (Tauri v2)
- Build: pnpm (configured in tauri.conf.json)

## Development Commands

### Frontend Development
```bash
# Start Vite dev server (runs on port 1420)
pnpm dev

# Type-check and build frontend for production
pnpm build

# Preview production build
pnpm preview
```

### Tauri Development
```bash
# Run Tauri in dev mode (starts Vite dev server automatically)
pnpm tauri dev

# Build Tauri app for production
pnpm tauri build
```

### Rust/Tauri Commands
```bash
# Check Rust code (from src-tauri directory)
cargo check

# Run Rust linter
cargo clippy

# Run Rust tests
cargo test

# Format Rust code
cargo fmt
```

## Architecture

### Frontend-Backend Communication
The app uses Tauri's command system for JS-to-Rust communication:

1. **Rust side** (`src-tauri/src/lib.rs`): Define commands with `#[tauri::command]` macro
   - Commands are registered via `.invoke_handler(tauri::generate_handler![command_name])`
   - Accepts serializable parameters using serde

2. **JS side** (`src/App.tsx`): Call Rust commands using `invoke()` from `@tauri-apps/api/core`
   ```typescript
   import { invoke } from "@tauri-apps/api/core";
   const result = await invoke("command_name", { param });
   ```

### Project Structure
```
src/                    # React frontend
  App.tsx              # Main React component
  main.tsx             # React entry point
src-tauri/             # Rust backend
  src/
    lib.rs             # Tauri commands and app setup
    main.rs            # Entry point (calls lib.rs::run())
  Cargo.toml           # Rust dependencies
  tauri.conf.json      # Tauri app configuration
vite.config.ts         # Vite bundler config (port 1420, HMR on 1421)
```

### Key Configuration Details

**Vite Config** (`vite.config.ts`):
- Fixed port: 1420 (required by Tauri)
- HMR port: 1421 (when TAURI_DEV_HOST is set)
- Ignores `src-tauri` directory for hot reload

**Tauri Config** (`src-tauri/tauri.conf.json`):
- Uses pnpm as package manager
- Dev URL: `http://localhost:1420`
- Window size: 800x600
- CSP disabled for development

**TypeScript Config**:
- Strict mode enabled
- No unused locals/parameters allowed
- JSX set to `react-jsx` (new JSX transform)

## Adding New Features

### Adding a new Tauri command:
1. In `src-tauri/src/lib.rs`, add the function with `#[tauri::command]`
2. Register it in `.invoke_handler(tauri::generate_handler![your_command])`
3. In frontend, call it with `invoke("your_command", { params })`

### Building the desktop app:
- Use `pnpm tauri build` to create platform-specific binaries
- Output bundles are in `src-tauri/target/release/bundle/`
