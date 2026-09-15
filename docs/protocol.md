# Protocol Specification - Optical Binary Packet Protocol (v1)

## 1. Frame Structure
Every frame transmitted across the optical link follows the binary specification:

| Field | Offset | Size | Value / Description |
| :--- | :--- | :--- | :--- |
| **MAGIC** | 0 | 2 Bytes | `0xAA55` (Fixed Magic Identifier) |
| **VERSION** | 2 | 1 Byte | `0x01` (Protocol Version) |
| **TYPE** | 3 | 1 Byte | Packet Type Command (e.g. `0x20` DATA, `0x30` ACK) |
| **FLAGS** | 4 | 1 Byte | `0x01` Encrypted, `0x04` Last Chunk |
| **SEQ** | 5 | 4 Bytes | 32-bit Big-Endian Unsigned Sequence Number |
| **LENGTH** | 9 | 4 Bytes | 32-bit Big-Endian Payload Byte Length |
| **PAYLOAD** | 13 | N Bytes | Binary File Data or JSON Metadata |
| **CRC32** | 13+N | 4 Bytes | IEEE 802.3 Checksum (Magic through Payload) |

## 2. Packet Types
- `0x01` HELLO / `0x02` HELLO_ACK
- `0x10` FILE_START / `0x11` FILE_START_ACK
- `0x20` DATA
- `0x30` ACK / `0x31` NACK
- `0x40` FILE_END / `0x41` FILE_END_ACK
- `0x50` RESUME_REQUEST / `0x51` RESUME_RESPONSE
- `0x60` PAUSE / `0x61` RESUME / `0x70` CANCEL / `0x80` ERROR
