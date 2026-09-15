# End-to-End User Manual & Operation Guide

This guide provides step-by-step instructions on how to use the **Optical Fiber File Transfer System** in both GUI Desktop Mode and Headless CLI Mode.

---

## Scenario A: Operating in Simulation Mode (No Physical Optical Hardware Needed)

You can run full end-to-end transfers immediately on a single computer or two local processes without any optical hardware.

### Step 1: Launch Desktop UI
```bash
npm run dev:desktop
```
Open `http://localhost:3000` in your web browser.

### Step 2: Sending a File via Desktop UI
1. Click **Send Files** on the top navigation bar.
2. Click **+ Add Synthetic Test File** or drag & drop files/folders into the zone.
3. Click **Start Optical Transfer**.
4. The screen switches to the **Dashboard** displaying live speed metrics (Mbps / MB/s), active transfer progress bar, and real-time SVG throughput graph.

### Step 3: Receiver Operation
1. Click **Receiver** tab.
2. Configure the **Target Save Directory** (defaults to `./downloads`).
3. Ensure **Automatically accept incoming optical transfers** is checked.
4. When sender initiates a transfer, incoming packets are streamed, buffered, reassembled, SHA-256 verified, and automatically saved.

---

## Scenario B: Operating in Physical Optical Hardware Mode

When physical USB optical transceivers are connected via optical fiber cable:

### Step 1: Connect Hardware
1. Connect USB-to-Optical Adapter to **Computer A** (Sender) and **Computer B** (Receiver).
2. Connect LC optical fiber cable between both adapters.

### Step 2: Start Receiver on Computer B
On Computer B (Receiver):
```bash
# Launch GUI Desktop App
npm run dev:desktop
# Select "Hardware Mode" on top badge

# OR via Headless CLI:
node apps/cli/src/index.js receive --dir /home/user/optical_downloads
```

### Step 3: Send File from Computer A
On Computer A (Sender):
```bash
# Launch GUI Desktop App and select target file

# OR via Headless CLI:
node apps/cli/src/index.js send /path/to/large_video.mp4
```

---

## Scenario C: CLI Diagnostics & Benchmarking

### Run Optical Link Diagnostics
```bash
node apps/cli/src/index.js diagnostics
```
*Tests physical connection, loopback buffer latency, CRC32 encoder/decoder integrity, and resumable journal read/write.*

### Run 100 MB End-to-End Benchmark
```bash
node apps/cli/src/index.js benchmark --size 100
```
*Generates 100 MB synthetic binary payload, connects simulated optical link with 0.1% loss, measures duration, average Mbps, CRC checks, and SHA-256 integrity.*

---

## Resumable Transfers & Disconnect Recovery

If the optical link is physically interrupted during a transfer:
1. The state machine transitions to `PAUSED` or `DISCONNECTED`.
2. Partial data is preserved in `.part` file alongside `.transfer.json` metadata journal.
3. When connection returns, click **Resume** (or pass `--resume` flag in CLI).
4. Receiver informs sender of the last acknowledged chunk sequence number, continuing seamlessly without re-sending from zero.
