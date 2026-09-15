import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Generates a random 256-bit encryption key.
 * @returns {Buffer}
 */
export function generateKey() {
  return crypto.randomBytes(32);
}

/**
 * Encrypts payload buffer using AES-256-GCM.
 * @param {Buffer} buffer
 * @param {Buffer} key 32-byte key
 * @returns {Buffer} Format: [12-byte IV][16-byte AuthTag][Encrypted Data]
 */
export function encryptBuffer(buffer, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypts AES-256-GCM encrypted payload buffer.
 * @param {Buffer} encryptedBuffer
 * @param {Buffer} key 32-byte key
 * @returns {Buffer}
 */
export function decryptBuffer(encryptedBuffer, key) {
  if (encryptedBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Encrypted payload too short');
  }

  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
