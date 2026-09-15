import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { SimulationTransport } from '@optical/transport';
import { FileSender, FileReceiver } from '@optical/transfer-engine';

test('Chaos Recovery Test: 1% Packet Loss & Retransmission Recovery', async () => {
  const testFile = path.resolve('./chaos_source_test.bin');
  const destDir = path.resolve('./chaos_dest_test');

  // Generate 2 MB test file
  const testData = crypto.randomBytes(2 * 1024 * 1024);
  fs.writeFileSync(testFile, testData);
  const originalSHA = crypto.createHash('sha256').update(testData).digest('hex');

  // Configure simulation with 1% packet loss
  const senderTransport = new SimulationTransport({ latencyMs: 1, lossRate: 0.01 });
  const receiverTransport = new SimulationTransport({ latencyMs: 1, lossRate: 0.01 });
  senderTransport.pair(receiverTransport);

  const receiver = new FileReceiver(receiverTransport, { destinationDir: destDir });
  const sender = new FileSender(senderTransport, { chunkSize: 32 * 1024, ackTimeoutMs: 100 });

  const completedPromise = new Promise((resolve, reject) => {
    receiver.on('transferCompleted', (event) => resolve(event.payload || event));
    sender.on('transferFailed', (err) => reject(new Error(err.reason)));
  });

  await sender.sendFile(testFile);
  const result = await completedPromise;

  assert.equal(result.sha256, originalSHA);
  const receivedData = fs.readFileSync(result.destination);
  assert.equal(crypto.createHash('sha256').update(receivedData).digest('hex'), originalSHA);

  // Cleanup
  fs.unlinkSync(testFile);
  fs.rmSync(destDir, { recursive: true, force: true });
});
