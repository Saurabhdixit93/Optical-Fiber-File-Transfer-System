// IEEE 802.3 CRC32 lookup table
const crcTable = new Uint32Array(256);

for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

/**
 * Calculates CRC32 checksum for a given Buffer or Uint8Array.
 * @param {Buffer|Uint8Array} buf
 * @param {number} [seed=0]
 * @returns {number} 32-bit unsigned integer CRC
 */
export function calculateCRC32(buf, seed = 0) {
  let crc = (seed ^ (-1)) >>> 0;
  for (let i = 0; i < buf.length; i++) {
    crc = (crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ (-1)) >>> 0;
}

/**
 * Verifies if calculated CRC matches expected CRC.
 * @param {Buffer|Uint8Array} buf
 * @param {number} expectedCRC
 * @returns {boolean}
 */
export function verifyCRC32(buf, expectedCRC) {
  return calculateCRC32(buf) === (expectedCRC >>> 0);
}
