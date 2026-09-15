# Production Deployment & Distribution Guide

This document details how to package, deploy, and distribute the **Optical Fiber File Transfer System** across production desktop environments, offline workstation pairs, and CLI automated servers.

---

## 1. Deployment Paradigm

Unlike typical cloud SaaS applications, the Optical Fiber File Transfer System is **100% Offline and Point-to-Point**. It requires zero cloud infrastructure, zero database servers, and zero internet connection.

```text
┌──────────────────────────────────────┐       PHYSICAL OPTICAL FIBER       ┌──────────────────────────────────────┐
│        COMPUTER A (Sender)           │       (Galvanically Isolated)      │       COMPUTER B (Receiver)          │
│                                      │                                    │                                      │
│  ┌────────────────────────────────┐  │   ┌─────────────┐  LIGHT  ┌─────┐  │  ┌────────────────────────────────┐  │
│  │ Optical Desktop App / CLI      │  │──>│ USB Optical │────────>│ SFP │─>│  │ Optical Desktop App / CLI      │  │
│  │ (Electron / Tauri / Node)      │  │   │ Transceiver │<────────│ MAC │  │  │ (Electron / Tauri / Node)      │  │
│  └────────────────────────────────┘  │   └─────────────┘  LIGHT  └─────┘  │  └────────────────────────────────┘  │
└──────────────────────────────────────┘                                    └──────────────────────────────────────┘
```

---

## 2. Desktop Application Packaging & Bundle Creation

### Option A: Tauri Packaging (Recommended for Production)

Tauri produces ultra-lightweight (~10-15 MB) native binaries for macOS, Windows, and Linux.

1. **Install Tauri CLI**:

   ```bash
   npm install --save-dev @tauri-apps/cli
   ```

2. **Build Desktop App Bundle**:

   ```bash
   # Build Vite React frontend static assets
   npm --workspace=apps/desktop run build

   # Package desktop installer (.dmg, .msi, .deb, .AppImage)
   npx tauri build
   ```

   _Output artifacts are created in `apps/desktop/src-tauri/target/release/bundle/`._

### Option B: Electron / Standalone Node Distribution

If using Node.js desktop wrapper (Electron or NodeGUI):

```bash
npm install --save-dev electron electron-builder
npx electron-builder --mac --win --linux
```

---

## 3. CLI Executable Distribution

To distribute standalone binary executables for headless workstations (without requiring Node.js to be installed on target machines):

1. **Using `@yao-pkg/pkg`**:

   ```bash
   npx @yao-pkg/pkg apps/cli/src/index.js --targets node20-macos-x64,node20-macos-arm64,node20-win-x64,node20-linux-x64 --out-path ./dist/bin
   ```

   This generates:
   - `dist/bin/optical-transfer-macos`
   - `dist/bin/optical-transfer-win.exe`
   - `dist/bin/optical-transfer-linux`

2. **Global NPM Installation**:

   ```bash
   npm install -g optical-file-transfer
   optical-transfer --help
   ```

---

## 4. Hardware Hardware Deployment Setup

### Required Physical Components

1. **2x USB Optical Interface Adapters**: USB 3.0 to SFP/SFP+ Optical Transceiver interface (e.g. Fiber Gigabit USB Adapter with FT232H / CP2102 UART bridge or custom FPGA transceiver).
2. **2x SFP/SFP+ Optical Transceiver Modules**: 850nm Multi-Mode or 1310nm Single-Mode SFP transceivers.
3. **1x Duplex Optical Fiber Cable**: LC-to-LC Duplex Fiber Optic Patch Cable (OM3 Multi-Mode or OS2 Single-Mode).

### Cabling Steps

1. Plug **Adapter A** into USB 3.0 port on **Computer A**.
2. Plug **Adapter B** into USB 3.0 port on **Computer B**.
3. Insert **SFP Module A** into Adapter A and **SFP Module B** into Adapter B.
4. Cross-connect the LC duplex fiber cable:
   - **TX** of Adapter A → **RX** of Adapter B
   - **RX** of Adapter A → **TX** of Adapter B
5. Operating system will register serial port (e.g., `/dev/ttyUSB0` on Linux/macOS or `COM3` on Windows).

---

## 5. Offline Air-Gapped Workstation Deployment

For air-gapped / secure environments (military, financial, medical, isolated industrial labs):

1. **Build offline bundle on build machine**:
   ```bash
   npm run build
   npx tauri build  # or package standalone binary
   ```
2. **Transfer installation binaries**:
   Copy `.dmg` / `.exe` / binary executable onto an approved USB flash drive or CD-ROM.
3. **Install on Target Machines**:
   - Install binary on **Computer A** (Sender).
   - Install binary on **Computer B** (Receiver).
4. Launch app in **Hardware Mode** (or **Simulation Mode** if testing before optical hardware arrives).
