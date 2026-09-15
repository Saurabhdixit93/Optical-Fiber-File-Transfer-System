import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { sanitizeDestinationPath } from '@optical/transfer-engine';

test('Security Path Traversal Prevention', () => {
  const destDir = path.resolve('./downloads');

  // Normal safe filename
  const safePath = sanitizeDestinationPath(destDir, 'sample_image.png');
  assert.equal(safePath, path.join(destDir, 'sample_image.png'));

  // Path traversal attack attempts
  assert.equal(sanitizeDestinationPath(destDir, '../../etc/passwd'), path.join(destDir, 'passwd'));
  assert.equal(sanitizeDestinationPath(destDir, '..\\..\\Windows\\System32\\cmd.exe'), path.join(destDir, 'cmd.exe'));
});
