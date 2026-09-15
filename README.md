# Optical Fiber File Transfer System

A production-grade, offline-first **Optical Fiber File Transfer System** that streams files of any size between endpoints using a reliable binary optical transport protocol.

> **Zero Network Dependency**: Operates completely offline without WiFi, Bluetooth, Ethernet, or internet infrastructure. Communication occurs strictly across USB optical interface transceivers / simulated optical channels.

---

## Key Features

- **Layered Decoupled Architecture**: Complete isolation between UI Layer (React 18), Application Layer, Protocol Engine, HAL, and Hardware Transceivers.
- **Binary Packet Protocol (v1)**: Magic header bytes (`0xAA55`), sequence numbering, IEEE 802.3 CRC32 checksum validation, and out-of-order packet reassembly.
- **Selective Repeat ARQ**: Sliding window retransmission engine (`WINDOW_SIZE = 64`) with per-packet NACK requests.
- **Receiver Flow Control**: Receiver-advertised window backpressure prevents buffer overflow or RAM bloat.
- **Zero-RAM Dynamic Streaming**: Transfers files of **any length / size** (from megabytes to 10GB+) using Node.js stream chunking (4 KB to 256 KB).
- **Resumable Journaling**: Automatic state persistence (`.part` assembly + `.transfer.json` metadata journal) recovers interrupted transfers.
- **Streaming SHA-256 Verification**: On-the-fly sender & receiver hash calculation ensures 100% data integrity before final file rename.
- **Security Path Traversal Guard**: Prevents arbitrary path execution and directory traversal attacks (`../../`).
- **Loopback Hardware Simulation Engine**: Customizable optical link simulation supporting latency, 0.1%-10% packet loss chaos testing, bit-flip corruption, and link disconnections.
- **Modern High-Density Desktop UI**: Built with Vite, React 18, Tailwind CSS, Lucide icons, and live SVG throughput monitoring.
- **Complete CLI & Benchmark Tools**: Command line interface for headless optical file transfers and synthetic benchmarks.

---

## Monorepo Architecture

```text
optical-file-transfer/
├── ARCHITECTURE.md
├── package.json
├── tsconfig.base.json
├── packages/
│   ├── protocol/         # Binary framing (0xAA55), CRC32, packet encoder/decoder
│   ├── transport/        # Hardware Abstraction Layer (HAL) & SimulationTransport
│   ├── transfer-engine/ # ARQ sliding window, resumable journaling, SHA256, chunker
│   ├── crypto/           # AES-256-GCM payload encryption module
│   └── shared/           # Models, TransferState machine, Logger, EventEmitter
├── apps/
│   ├── desktop/          # React 18 + Vite technical UI dashboard
│   └── cli/              # Command line interface executable (bin/optical-transfer)
├── tests/                # Automated Unit, Integration, and Chaos test suites
└── docs/                 # Architectural, protocol, deployment, hardware & user guides
```

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Test Suite
```bash
npm test
```
*Executes unit tests, CRC32 bit-flip rejection, path security sanitization, end-to-end simulation transfer, and 1% packet loss chaos recovery tests.*

### 3. Run End-to-End Benchmark
```bash
npm run benchmark
```

### 4. Start Desktop UI
```bash
npm run dev:desktop
```
Open `http://localhost:3000` in your browser.

### 5. Run CLI Commands
```bash
# View optical status
node apps/cli/src/index.js status

# Send a file
node apps/cli/src/index.js send /path/to/file.iso

# Run diagnostics
node apps/cli/src/index.js diagnostics
```

---

## Complete Documentation & Guides
- [End-to-End User Manual & How To Use](docs/user_guide.md)
- [Production Deployment & Distribution Guide](docs/deployment.md)
- [Architecture Specifications](docs/architecture.md)
- [Binary Protocol Specification](docs/protocol.md)
- [Hardware Interface Specifications](docs/hardware.md)
- [Development Guide](docs/development.md)
- [Troubleshooting Guide](docs/troubleshooting.md)
