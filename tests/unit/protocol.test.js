import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodePacket,
  decodePacket,
  calculateCRC32,
  verifyCRC32,
  PROTOCOL_MAGIC,
  PacketType
} from '@optical/protocol';

test('CRC32 checksum calculation and verification', () => {
  const data = Buffer.from('Optical Fiber File Transfer System CRC Test', 'utf-8');
  const crc = calculateCRC32(data);
  assert.equal(typeof crc, 'number');
  assert.equal(verifyCRC32(data, crc), true);
  assert.equal(verifyCRC32(data, crc ^ 0xFFFFFFFF), false);
});

test('Packet Encoding and Decoding Roundtrip', () => {
  const payload = Buffer.from('Testing packet payload string data', 'utf-8');
  const original = {
    type: PacketType.DATA,
    seq: 1042,
    flags: 0,
    payload
  };

  const encoded = encodePacket(original);
  assert.ok(encoded.length > payload.length);

  const decoded = decodePacket(encoded);
  assert.equal(decoded.magic, PROTOCOL_MAGIC);
  assert.equal(decoded.type, PacketType.DATA);
  assert.equal(decoded.seq, 1042);
  assert.equal(decoded.payload.toString('utf-8'), 'Testing packet payload string data');
});

test('Packet Decoding Rejects Corrupted Payloads (CRC Bit-flip)', () => {
  const payload = Buffer.from('Sensitive payload string', 'utf-8');
  const encoded = encodePacket({ type: PacketType.DATA, seq: 1, payload });

  // Corrupt a byte in the payload
  encoded[18] ^= 0xFF;

  assert.throws(() => {
    decodePacket(encoded);
  }, /CRC32 mismatch/);
});

test('Packet Decoding Rejects Invalid Magic Bytes', () => {
  const payload = Buffer.from('Test', 'utf-8');
  const encoded = encodePacket({ type: PacketType.DATA, seq: 1, payload });

  // Change magic bytes
  encoded.writeUInt16BE(0x1234, 0);

  assert.throws(() => {
    decodePacket(encoded);
  }, /Invalid MAGIC/);
});
