import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { TypedEventEmitter, TransferState, EventNames, defaultLogger } from '@optical/shared';
import {
  encodePacket,
  PacketType,
  PacketFlags,
  PacketFramer
} from '@optical/protocol';
import { sanitizeDestinationPath } from './security.js';
import { TransferJournal } from './journal.js';

export class FileReceiver extends TypedEventEmitter {
  constructor(transport, options = {}) {
    super();
    this.transport = transport;
    this.destinationDir = options.destinationDir || './downloads';
    this.receiverId = options.receiverId || 'OPT-NODE-RECEIVER-90B1';
    this.autoAccept = options.autoAccept ?? true;
    this.framer = new PacketFramer();

    this.state = TransferState.IDLE;
    this.meta = null;
    this.pendingRequest = null;
    this.partFilePath = null;
    this.finalFilePath = null;
    this.writeStream = null;
    this.inMemoryChunks = [];
    this.hashStream = crypto.createHash('sha256');

    this.expectedSeq = 1;
    this.receivedChunksBuffer = new Map();
    this.receiverWindowSize = options.receiverWindowSize || 64;
    this.lastNackTimeMap = new Map(); // seq -> timestamp

    this.stats = {
      bytesReceived: 0,
      packetsReceived: 0,
      crcErrors: 0,
      nacksSent: 0,
      startTime: null
    };

    this._setupTransportListeners();
  }

  _setupTransportListeners() {
    this.transport.on('data', (chunk) => {
      const packets = this.framer.push(chunk);
      for (const packet of packets) {
        this._handlePacket(packet);
      }
    });
  }

  async _handlePacket(packet) {
    switch (packet.type) {
      case PacketType.FILE_START:
        await this._handleFileStart(packet);
        break;

      case PacketType.DATA:
        await this._handleDataChunk(packet);
        break;

      case PacketType.FILE_END:
        await this._handleFileEnd(packet);
        break;

      case PacketType.PAUSE:
        this.state = TransferState.PAUSED;
        this.emitEvent(EventNames.TRANSFER_PAUSED);
        break;

      case PacketType.RESUME:
        this.state = TransferState.TRANSFERRING;
        this.emitEvent(EventNames.TRANSFER_RESUMED);
        break;

      case PacketType.CANCEL:
        this.state = TransferState.CANCELLED;
        this.emitEvent(EventNames.TRANSFER_CANCELLED);
        this._cleanupFiles(false);
        break;
    }
  }

  async _handleFileStart(packet) {
    try {
      this.meta = JSON.parse(packet.payload.toString('utf-8'));

      if (this.meta.targetReceiverId && this.meta.targetReceiverId !== 'ANY' && this.meta.targetReceiverId !== this.receiverId) {
        const rejectMsg = `Target Receiver ID mismatch: Intended for ${this.meta.targetReceiverId}, but this node is ${this.receiverId}`;
        defaultLogger.warn(rejectMsg);
        await this.transport.send(encodePacket({
          type: PacketType.REJECT,
          seq: 0,
          payload: Buffer.from(rejectMsg, 'utf-8')
        }));
        return;
      }

      this.finalFilePath = sanitizeDestinationPath(this.destinationDir, this.meta.filename);
      this.partFilePath = `${this.finalFilePath}.part`;
      this.inMemoryChunks = [];
      this.expectedSeq = 1;
      this.lastNackTimeMap.clear();
      this.hashStream = crypto.createHash('sha256');

      this.pendingRequest = {
        meta: this.meta,
        startPacketSeq: packet.seq
      };

      if (!this.autoAccept) {
        this.state = TransferState.WAITING_FOR_ACCEPT;
        this.emitEvent('transferRequest', this.meta);
        return;
      }

      await this.acceptTransfer();
    } catch (err) {
      defaultLogger.error(`Error handling FILE_START: ${err.message}`);
      this.state = TransferState.FAILED;
      this.emitEvent(EventNames.TRANSFER_FAILED, { reason: err.message });
    }
  }

  async acceptTransfer() {
    if (!this.meta) return;

    try {
      const targetDir = path.dirname(this.finalFilePath);
      if (fs.existsSync && !fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const journal = await TransferJournal.readJournal(this.partFilePath);
      if (journal && journal.sha256 === this.meta.sha256 && fs.existsSync && fs.existsSync(this.partFilePath)) {
        const stat = fs.statSync(this.partFilePath);
        const lastSeq = Math.floor(stat.size / this.meta.chunkSize);
        this.expectedSeq = lastSeq + 1;
        this.stats.bytesReceived = stat.size;
        this.writeStream = fs.createWriteStream(this.partFilePath, { flags: 'a' });
      } else {
        this.writeStream = fs.createWriteStream(this.partFilePath, { flags: 'w' });
        this.stats.bytesReceived = 0;
      }
    } catch {
      this.writeStream = null;
      this.stats.bytesReceived = 0;
    }

    await TransferJournal.saveJournal(this.partFilePath, {
      transferId: this.meta.transferId,
      filename: this.meta.filename,
      size: this.meta.size,
      sha256: this.meta.sha256,
      lastAcknowledgedSeq: this.expectedSeq - 1
    });

    this.state = TransferState.TRANSFERRING;
    this.stats.startTime = Date.now();
    this.emitEvent(EventNames.TRANSFER_STARTED, this.meta);

    const ackPacket = {
      type: PacketType.FILE_START_ACK,
      seq: 0,
      payload: Buffer.from(JSON.stringify({ receiverId: this.receiverId, status: 'ACCEPTED' }), 'utf-8')
    };
    await this.transport.send(encodePacket(ackPacket));
  }

  async rejectTransfer(reason = 'User rejected transfer request') {
    this.state = TransferState.FAILED;
    await this.transport.send(encodePacket({
      type: PacketType.REJECT,
      seq: 0,
      payload: Buffer.from(reason, 'utf-8')
    }));
    this.emitEvent(EventNames.TRANSFER_CANCELLED, { reason });
  }

  async _handleDataChunk(packet) {
    if (this.state !== TransferState.TRANSFERRING) return;

    const seq = packet.seq;
    this.stats.packetsReceived++;

    if (seq < this.expectedSeq) {
      await this._sendAck(seq);
      return;
    }

    if (seq === this.expectedSeq) {
      this._writeChunk(packet.payload);
      this.expectedSeq++;

      while (this.receivedChunksBuffer.has(this.expectedSeq)) {
        const nextBuf = this.receivedChunksBuffer.get(this.expectedSeq);
        this.receivedChunksBuffer.delete(this.expectedSeq);
        this._writeChunk(nextBuf);
        this.expectedSeq++;
      }

      await this._sendAck(seq);
      if (seq % 64 === 0 || (this.meta && seq >= (this.meta.totalChunks || 0))) {
        await TransferJournal.saveJournal(this.partFilePath, {
          transferId: this.meta.transferId,
          filename: this.meta.filename,
          size: this.meta.size,
          sha256: this.meta.sha256,
          lastAcknowledgedSeq: this.expectedSeq - 1
        });
      }

      this.emitEvent(EventNames.TRANSFER_PROGRESS, {
        bytesReceived: this.stats.bytesReceived,
        totalBytes: this.meta.size,
        progressPercent: ((this.stats.bytesReceived / this.meta.size) * 100).toFixed(1)
      });

    } else if (seq > this.expectedSeq) {
      if (this.receivedChunksBuffer.size < this.receiverWindowSize) {
        this.receivedChunksBuffer.set(seq, packet.payload);
      }

      // Rate-limit NACK requests for the same missing expectedSeq to avoid flooding
      const now = Date.now();
      const lastNack = this.lastNackTimeMap.get(this.expectedSeq) || 0;
      if (now - lastNack > 30) { // 30ms rate limit per missing seq
        this.lastNackTimeMap.set(this.expectedSeq, now);
        this.stats.nacksSent++;
        await this._sendNack(this.expectedSeq);
      }
    }
  }

  _writeChunk(payload) {
    if (this.writeStream) {
      this.writeStream.write(payload);
    }
    this.inMemoryChunks.push(payload);
    this.hashStream.update(payload);
    this.stats.bytesReceived += payload.length;
  }

  async _handleFileEnd(packet) {
    this.state = TransferState.VERIFYING;
    if (this.writeStream) {
      this.writeStream.end();
    }

    const computedSHA256 = this.hashStream.digest('hex');
    const matches = computedSHA256.toLowerCase() === this.meta.sha256.toLowerCase();

    if (matches) {
      if (this.writeStream && fs.existsSync && fs.existsSync(this.partFilePath)) {
        try { fs.renameSync(this.partFilePath, this.finalFilePath); } catch {}
      }
      await TransferJournal.deleteJournal(this.partFilePath);
      this.state = TransferState.COMPLETED;
      defaultLogger.info(`Transfer verified & completed: ${this.finalFilePath}`);
      this.emitEvent(EventNames.TRANSFER_COMPLETED, {
        filename: this.meta.filename,
        destination: this.finalFilePath,
        size: this.stats.bytesReceived,
        sha256: computedSHA256,
        chunks: [...this.inMemoryChunks]
      });
      await this._sendAck(packet.seq);
    } else {
      this.state = TransferState.FAILED;
      defaultLogger.error(`SHA256 Mismatch! Expected: ${this.meta.sha256}, Computed: ${computedSHA256}`);
      this.emitEvent(EventNames.TRANSFER_FAILED, {
        reason: `SHA256 verification failed (expected ${this.meta.sha256}, got ${computedSHA256})`
      });
      await this._sendNack(packet.seq);
    }
  }

  async _sendAck(seq) {
    const winBuffer = Buffer.alloc(4);
    const availableWin = Math.max(0, this.receiverWindowSize - this.receivedChunksBuffer.size);
    winBuffer.writeUInt32BE(availableWin, 0);

    const ackPacket = {
      type: PacketType.ACK,
      seq,
      payload: winBuffer
    };
    await this.transport.send(encodePacket(ackPacket));
  }

  async _sendNack(seq) {
    const nackPacket = {
      type: PacketType.NACK,
      seq
    };
    await this.transport.send(encodePacket(nackPacket));
  }

  _cleanupFiles(deletePart = false) {
    if (this.writeStream) {
      this.writeStream.destroy();
    }
    if (deletePart && this.partFilePath && fs.existsSync && fs.existsSync(this.partFilePath)) {
      try {
        fs.unlinkSync(this.partFilePath);
      } catch {}
    }
  }
}
