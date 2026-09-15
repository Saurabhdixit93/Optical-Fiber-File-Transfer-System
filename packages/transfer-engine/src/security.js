import path from 'node:path';

/**
 * Sanitizes and validates a requested filename to prevent path traversal security vulnerabilities.
 * Ensures the destination path stays strictly inside destinationDir.
 *
 * @param {string} destinationDir Root directory where files are stored
 * @param {string} requestedFilename Filename sent by sender
 * @returns {string} Safe absolute path
 */
export function sanitizeDestinationPath(destinationDir, requestedFilename) {
  if (!requestedFilename || typeof requestedFilename !== 'string') {
    throw new Error('Invalid filename');
  }

  // Extract base filename to prevent directory traversal
  const safeName = path.basename(requestedFilename.replace(/\\/g, '/'));
  if (!safeName || safeName === '.' || safeName === '..') {
    throw new Error('Unsafe or empty filename path component');
  }

  const resolvedDir = path.resolve(destinationDir);
  const targetPath = path.resolve(resolvedDir, safeName);

  if (!targetPath.startsWith(resolvedDir)) {
    throw new Error(`Security Violation: Path traversal attack detected (${requestedFilename})`);
  }

  return targetPath;
}
