import { calculateCRC32, verifyCRC32 } from './crc32.js';
import {
  PROTOCOL_MAGIC,
  PROTOCOL_VERSION,
  HEADER_SIZE,
  CRC_SIZE,
  MIN_PACKET_SIZE,
  PacketFlags
} from './constants.js';

/**
 * @typedef {Object} Packet
 * @property {number} version
 * @property {number} type
 * @property {number} [flags=0]
 * @property {number} seq
 * @property {Buffer} [payload]
 */

/**
 * Encodes a packet object into a raw Buffer frame.
 * Frame Layout: [HEADER (13 bytes)][PAYLOAD (N bytes)][CRC32 (4 bytes)]
 *
 * @param {Packet} packet
 * @returns {Buffer}
 */
export function encodePacket(packet) {
  const payload = packet.payload || Buffer.alloc(0);
  const length = payload.length;
  const totalSize = HEADER_SIZE + length + CRC_SIZE;
  const buffer = Buffer.allocUnsafe(totalSize);

  // Header
  buffer.writeUInt16BE(PROTOCOL_MAGIC, 0);
  buffer.writeUInt8(packet.version || PROTOCOL_VERSION, 2);
  buffer.writeUInt8(packet.type, 3);
  buffer.writeUInt8(packet.flags || PacketFlags.NONE, 4);
  buffer.writeUInt32BE(packet.seq || 0, 5);
  buffer.writeUInt32BE(length, 9);

  // Payload
  if (length > 0) {
    payload.copy(buffer, HEADER_SIZE);
  }

  // Calculate CRC32 over Header + Payload
  const dataToChecksum = buffer.subarray(0, HEADER_SIZE + length);
  const crc = calculateCRC32(dataToChecksum);
  buffer.writeUInt32BE(crc, HEADER_SIZE + length);

  return buffer;
}

/**
 * Decodes a raw Buffer into a Packet object after validating magic, version, length & CRC32.
 *
 * @param {Buffer} buffer
 * @returns {Packet}
 */
export function decodePacket(buffer) {
  if (buffer.length < MIN_PACKET_SIZE) {
    throw new Error(`Packet buffer too short: ${buffer.length} < ${MIN_PACKET_SIZE}`);
  }

  const magic = buffer.readUInt16BE(0);
  if (magic !== PROTOCOL_MAGIC) {
    throw new Error(`Invalid MAGIC: 0x${magic.toString(16)} expected 0x${PROTOCOL_MAGIC.toString(16)}`);
  }

  const version = buffer.readUInt8(2);
  if (version !== PROTOCOL_VERSION) {
    throw new Error(`Unsupported PROTOCOL_VERSION: ${version}`);
  }

  const type = buffer.readUInt8(3);
  const flags = buffer.readUInt8(4);
  const seq = buffer.readUInt32BE(5);
  const length = buffer.readUInt32BE(9);

  const expectedTotalSize = HEADER_SIZE + length + CRC_SIZE;
  if (buffer.length < expectedTotalSize) {
    throw new Error(`Truncated packet: length ${buffer.length} < expected ${expectedTotalSize}`);
  }

  // Check CRC32
  const dataToChecksum = buffer.subarray(0, HEADER_SIZE + length);
  const receivedCRC = buffer.readUInt32BE(HEADER_SIZE + length);

  if (!verifyCRC32(dataToChecksum, receivedCRC)) {
    throw new Error(`CRC32 mismatch: calculated 0x${calculateCRC32(dataToChecksum).toString(16)}, received 0x${receivedCRC.toString(16)}`);
  }

  const payload = length > 0 ? Buffer.from(buffer.subarray(HEADER_SIZE, HEADER_SIZE + length)) : Buffer.alloc(0);

  return {
    magic,
    version,
    type,
    flags,
    seq,
    length,
    payload,
    crc: receivedCRC
  };
}
