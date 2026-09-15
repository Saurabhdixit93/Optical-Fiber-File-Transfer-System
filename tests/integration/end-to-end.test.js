import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { SimulationTransport } from '@optical/transport';
import { FileSender, FileReceiver } from '@optical/transfer-engine';

test('End-to-End File Transfer over Simulation Transport with SHA256 Verification', async () => {
  const testFile = path.resolve('./e2e_source_test.bin');
  const destDir = path.resolve('./e2e_dest_test');

  // Generate 5 MB test file
  const testData = crypto.randomBytes(5 * 1024 * 1024);
  fs.writeFileSync(testFile, testData);
  const originalSHA = crypto.createHash('sha256').update(testData).digest('hex');

  // Pair simulation transports
  const senderTransport = new SimulationTransport({ latencyMs: 1 });
  const receiverTransport = new SimulationTransport({ latencyMs: 1 });
  senderTransport.pair(receiverTransport);

  const receiver = new FileReceiver(receiverTransport, { destinationDir: destDir });
  const sender = new FileSender(senderTransport, { chunkSize: 64 * 1024 });

  const completedPromise = new Promise((resolve, reject) => {
    receiver.on('transferCompleted', (event) => resolve(event.payload || event));
    sender.on('transferFailed', (err) => reject(new Error(err.reason)));
  });

  await sender.sendFile(testFile);
  const result = await completedPromise;

  assert.equal(result.sha256, originalSHA);
  assert.ok(fs.existsSync(result.destination));

  const receivedData = fs.readFileSync(result.destination);
  assert.equal(receivedData.length, testData.length);
  assert.equal(crypto.createHash('sha256').update(receivedData).digest('hex'), originalSHA);

  // Cleanup test artifacts
  fs.unlinkSync(testFile);
  fs.rmSync(destDir, { recursive: true, force: true });
});
