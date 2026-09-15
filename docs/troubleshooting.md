# Troubleshooting Guide

## Common Issues & Diagnostics

### 1. Optical Hardware Not Detected
- **Symptom**: System reports `Mode: Simulation Mode`.
- **Cause**: No USB optical transceiver module detected on `/dev/ttyUSB0` or COM port.
- **Resolution**: Toggle Mode to **Simulation Mode** in Navbar or Settings to test without physical optical hardware.

### 2. SHA256 Verification Failure
- **Symptom**: `INTEGRITY_FAILED` error emitted at transfer conclusion.
- **Cause**: Persistent noise or disk corruption.
- **Resolution**: Check disk health. Selective Repeat ARQ automatically retransmits corrupted packet frames.

### 3. High Retransmission Rate
- **Symptom**: Transfer speed drops under high loss simulation.
- **Resolution**: Adjust `chunkSize` (e.g. reduce to 16 KB) and `windowSize` in Settings.
