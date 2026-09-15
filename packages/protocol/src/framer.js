import { decodePacket } from './packet.js';
import { PROTOCOL_MAGIC, HEADER_SIZE, CRC_SIZE } from './constants.js';

export class PacketFramer {
  constructor() {
    this.buffer = Buffer.alloc(0);
  }

  /**
   * Appends incoming chunk to stream buffer and extracts any complete decoded packets.
   * @param {Buffer} chunk
   * @returns {Array<import('./packet.js').Packet>}
   */
  push(chunk) {
    if (chunk && chunk.length > 0) {
      this.buffer = Buffer.concat([this.buffer, chunk]);
    }

    const packets = [];

    while (this.buffer.length >= HEADER_SIZE + CRC_SIZE) {
      // Find magic bytes 0xAA55
      let magicIdx = -1;
      for (let i = 0; i <= this.buffer.length - 2; i++) {
        if (this.buffer.readUInt16BE(i) === PROTOCOL_MAGIC) {
          magicIdx = i;
          break;
        }
      }

      if (magicIdx === -1) {
        // No magic bytes found, discard buffer minus last 1 byte (in case magic split)
        this.buffer = this.buffer.subarray(Math.max(0, this.buffer.length - 1));
        break;
      }

      if (magicIdx > 0) {
        // Discard bytes preceding magic
        this.buffer = this.buffer.subarray(magicIdx);
      }

      if (this.buffer.length < HEADER_SIZE + CRC_SIZE) {
        break; // Wait for more header bytes
      }

      const length = this.buffer.readUInt32BE(9);
      const totalPacketLen = HEADER_SIZE + length + CRC_SIZE;

      if (this.buffer.length < totalPacketLen) {
        break; // Wait for full payload + CRC
      }

      const packetBuffer = this.buffer.subarray(0, totalPacketLen);
      try {
        const packet = decodePacket(packetBuffer);
        packets.push(packet);
        this.buffer = this.buffer.subarray(totalPacketLen);
      } catch (err) {
        // If decoding failed (e.g. CRC or invalid version), skip the bad magic bytes (shift by 2)
        this.buffer = this.buffer.subarray(2);
      }
    }

    return packets;
  }

  reset() {
    this.buffer = Buffer.alloc(0);
  }
}
