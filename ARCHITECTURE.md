# System Architecture - Optical Fiber File Transfer System

## 1. High-Level Architecture

The Optical Fiber File Transfer System is designed around a strictly layered, decoupled architecture to ensure that the user interface, session management, reliable protocol engine, hardware abstraction layer (HAL), and physical optical hardware operate independently.

```text
┌─────────────────────────────────────────────────────────────┐
│                       UI Layer                              │
│   Dashboard • Send File • Active Transfer • Diagnostics     │
│   Receiver • History • Settings • Real-Time Graph           │
└──────────────────────────────┬──────────────────────────────┘
                               │ Throttled Event Bridge (10-20 Hz)
┌──────────────────────────────▼──────────────────────────────┐
│                    Application Layer                        │
│   File Transfer Manager • Session Manager • Device Manager  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                     Protocol Layer                          │
│   Packet Encoder/Decoder • CRC32 Checksum • ARQ Engine      │
│   Sliding Window • Flow Control • Resumable Journaling      │
└──────────────────────────────┬──────────────────────────────┘
                               │ Byte Stream / Frame Pipe
┌──────────────────────────────▼──────────────────────────────┐
│                 Hardware Abstraction Layer                  │
│   SimulationTransport (Loss/Latency/Corruption Chaos)       │
│   SerialTransport / USBTransport Optical Interface          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                        OPTICAL FIBER / LINK
```

---

## 2. Layer Definitions

### 2.1 UI Layer (`apps/desktop`)
- **Built with**: React 18, Vite, Tailwind CSS, Lucide Icons, SVG Throughput Graph.
- **Responsibility**: Present technical, real-time transfer metrics (Mbps, MB/s, ETA, loss, CRC errors, retransmits, sequence numbers).
- **Control Flow**: Interacts with the local Application Layer via typed events and non-blocking IPC/WebSocket service. Does **not** directly access transport hardware.

### 2.2 Application Layer (`packages/shared`, `packages/transfer-engine`)
- **Responsibility**: Manages file transfer queues, directory validation, path traversal security, state machine transitions (`IDLE`, `TRANSFERRING`, `PAUSED`, `VERIFYING`, `COMPLETED`, `FAILED`, etc.), and SHA-256 integrity verification.
- **Resumability**: Manages session journal state (`.transfer.json`) and temporary chunk assembly files (`.part`).

### 2.3 Protocol Layer (`packages/protocol`)
- **Framing Structure**:
  - `MAGIC` (2 bytes): `0xAA55`
  - `PROTOCOL_VERSION` (1 byte): `0x01`
  - `TYPE` (1 byte): Packet Command Type
  - `FLAGS` (1 byte): Encryption/Compression/Last Chunk bits
  - `SEQ` (4 bytes): 32-bit sequence number
  - `LENGTH` (4 bytes): Payload length in bytes
  - `PAYLOAD` (N bytes): Chunk data or Metadata JSON
  - `CRC32` (4 bytes): ISO 3309 / IEEE 802.3 CRC32 checksum
- **ARQ Mechanism**: Selective Repeat Sliding Window (`WINDOW_SIZE = 64`). Handles out-of-order packet buffer reassembly and per-packet NACK retransmission requests.
- **Flow Control**: Receiver-advertised window size backpressure mechanism (`receiverWindow = 0` pauses sender dispatch).

### 2.4 Transport Layer (HAL) (`packages/transport`)
- **Abstract Interface (`ITransport`)**:
  - `connect(): Promise<void>`
  - `disconnect(): Promise<void>`
  - `send(buffer: Buffer): Promise<boolean>`
  - `receive(): EventEmitter`
  - `getStatus(): LinkStatus`
  - `getStatistics(): LinkStatistics`
- **Implementations**:
  - `SimulationTransport`: Dual-ended loopback transport simulating customizable fiber propagation latency, random packet loss (0.1%-10%), CRC bit-flip corruption, receiver disk write delay, and link disconnections.
  - `SerialTransport`: Hardware bridge interfacing with local USB-to-Optical transceiver MCUs/FPGAs via serial baud rates.

---

## 3. Data Integrity & Security Architecture

1. **CRC32 Validation**: Every incoming packet header and payload checksum is validated prior to processing. Corrupted packets trigger instant NACK requests without polluting higher layers.
2. **Streaming SHA-256 Checksum**: Sender calculates file SHA-256 on the fly during chunking. Receiver computes running SHA-256 while writing chunks to disk. Verification occurs upon receiving `FILE_END`.
3. **Path Traversal Guard**: Filename metadata is sanitized using strict path normalization. Attempts to write files outside the target destination root (e.g. `../../etc/passwd`) are rejected with `SECURITY_VIOLATION`.

---

## 4. Scalability & Memory Management

- **Zero-RAM Full File Buffering**: Files of any size (up to multi-terabyte datasets) are read via Node.js readable streams in discrete chunks (4 KB to 256 KB, default 64 KB).
- **Throttled State Dispatch**: Event emitters update internal stats every packet, but batch UI updates to 10-20 Hz to eliminate React rendering bottlenecks.
