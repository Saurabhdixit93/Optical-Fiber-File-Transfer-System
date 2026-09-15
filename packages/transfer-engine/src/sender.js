import fs from 'node:fs';
import crypto from 'node:crypto';
import { TypedEventEmitter, TransferState, EventNames, defaultLogger } from '@optical/shared';
import {
  encodePacket,
  PacketType,
  PacketFlags,
  PacketFramer
} from '@optical/protocol';

export class FileSender extends TypedEventEmitter {
  constructor(transport, options = {}) {
    super();
    this.transport = transport;
    this.options = {
      chunkSize: options.chunkSize || 128 * 1024,
      windowSize: options.windowSize || 128,
      ackTimeoutMs: options.ackTimeoutMs || 500,
      retryLimit: options.retryLimit || 50,
      senderId: options.senderId || 'OPT-NODE-SENDER-01',
      targetReceiverId: options.targetReceiverId || 'ANY',
      ...options
    };

    this.state = TransferState.IDLE;
    this.framer = new PacketFramer();
    this.transferId = null;
    this.filePath = null;
    this.fileObj = null;
    this.fileSize = 0;
    this.totalChunks = 0;
    this.sha256 = null;
    this.handshakeAccepted = false;
    this.rejectionReason = null;

    this.seq = 1;
    this.unackedPackets = new Map();
    this.receiverWindow = this.options.windowSize;

    this.stats = {
      bytesTransferred: 0,
      packetsSent: 0,
      packetsAcked: 0,
      packetsRetransmitted: 0,
      crcErrors: 0,
      startTime: null,
      currentSpeed: 0,
      averageSpeed: 0,
      eta: 0
    };

    this._setupTransportListeners();
  }

  _setupTransportListeners() {
    this.transport.on('data', (chunk) => {
      const packets = this.framer.push(chunk);
      for (const packet of packets) {
        this._handleIncomingPacket(packet);
      }
    });
  }

  _handleIncomingPacket(packet) {
    if (packet.type === PacketType.FILE_START_ACK) {
      this.handshakeAccepted = true;
    } else if (packet.type === PacketType.REJECT) {
      this.rejectionReason = packet.payload ? packet.payload.toString('utf-8') : 'Device ID mismatch or request rejected by receiver';
      this._failTransfer(`Receiver Rejected: ${this.rejectionReason}`);
    } else if (packet.type === PacketType.ACK) {
      const ackSeq = packet.seq;
      if (this.unackedPackets.has(ackSeq)) {
        const item = this.unackedPackets.get(ackSeq);
        this.stats.bytesTransferred += item.packet.payload ? item.packet.payload.length : 0;
        this.stats.packetsAcked++;
        this.unackedPackets.delete(ackSeq);

        if (packet.payload && packet.payload.length >= 4) {
          this.receiverWindow = packet.payload.readUInt32BE(0);
        }
      }
    } else if (packet.type === PacketType.NACK) {
      const nackSeq = packet.seq;
      if (this.unackedPackets.has(nackSeq)) {
        this._retransmitSeq(nackSeq, 'NACK received');
      }
    } else if (packet.type === PacketType.PAUSE) {
      this.pause();
    } else if (packet.type === PacketType.RESUME) {
      this.resume();
    } else if (packet.type === PacketType.CANCEL) {
      this.cancel();
    }
  }

  _retransmitSeq(seq, reason) {
    const item = this.unackedPackets.get(seq);
    if (!item) return;

    const now = Date.now();
    // Cooldown check: ignore duplicate NACK bursts within 40ms RTT window
    const minCooldownMs = 40;
    if (item.lastRetransmitTime && (now - item.lastRetransmitTime < minCooldownMs)) {
      return;
    }

    if (item.retries >= this.options.retryLimit) {
      this._failTransfer(`Retransmit limit reached for packet ${seq} (${reason})`);
      return;
    }

    item.retries++;
    item.timestamp = now;
    item.lastRetransmitTime = now;
    this.stats.packetsRetransmitted++;

    const encoded = encodePacket(item.packet);
    this.transport.send(encoded);
    this.emitEvent(EventNames.PACKET_RETRANSMITTED, { seq, reason });
  }

  async sendFile(fileOrPath, targetReceiverId = null, resumeFromSeq = 0) {
    let filename = '';
    const actualTargetReceiverId = targetReceiverId || this.options.targetReceiverId;

    if (typeof fileOrPath === 'string') {
      if (fs.existsSync && !fs.existsSync(fileOrPath)) {
        throw new Error(`File not found: ${fileOrPath}`);
      }
      this.filePath = fileOrPath;
      const stat = fs.statSync(fileOrPath);
      this.fileSize = stat.size;
      filename = fileOrPath.split(/[/\\]/).pop();
    } else if (fileOrPath && (fileOrPath instanceof Blob || fileOrPath.name)) {
      this.fileObj = fileOrPath;
      this.fileSize = fileOrPath.size;
      filename = fileOrPath.name;
    } else {
      throw new Error('Invalid file input for FileSender');
    }

    this.totalChunks = Math.ceil(this.fileSize / this.options.chunkSize) || 1;
    this.transferId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    this.handshakeAccepted = false;
    this.rejectionReason = null;

    this._setState(TransferState.CONNECTING);

    if (this.transport.getStatus() !== 'ACTIVE') {
      await this.transport.connect();
    }

    this._setState(TransferState.NEGOTIATING);
    defaultLogger.info(`Calculating SHA256 for ${filename}...`);
    this.sha256 = await this._calculateSHA256(fileOrPath, filename);

    const meta = {
      transferId: this.transferId,
      senderId: this.options.senderId,
      targetReceiverId: actualTargetReceiverId,
      filename,
      size: this.fileSize,
      chunkSize: this.options.chunkSize,
      totalChunks: this.totalChunks,
      sha256: this.sha256,
      resumeFromSeq
    };

    const startPacket = {
      type: PacketType.FILE_START,
      seq: 0,
      payload: Buffer.from(JSON.stringify(meta), 'utf-8')
    };

    await this.transport.send(encodePacket(startPacket));
    this._setState(TransferState.WAITING_FOR_ACCEPT);

    let waitTicks = 0;
    while (!this.handshakeAccepted) {
      if (this.state === TransferState.FAILED || this.state === TransferState.CANCELLED) {
        throw new Error(this.rejectionReason || 'Transfer handshake rejected by receiver');
      }
      await new Promise(resolve => setTimeout(resolve, 50));
      waitTicks++;
      if (waitTicks > 200) {
        this._failTransfer('Handshake timeout: Target receiver did not respond');
        throw new Error('Target receiver did not respond to handshake');
      }
    }

    this.stats.startTime = Date.now();
    this._setState(TransferState.TRANSFERRING);
    this.emitEvent(EventNames.TRANSFER_STARTED, meta);

    await this._streamFileChunks(fileOrPath, resumeFromSeq);
  }

  async _streamFileChunks(fileOrPath, resumeFromSeq = 0) {
    let currentChunkSeq = 1;
    let isLast = false;

    if (typeof fileOrPath === 'string') {
      const fileStream = fs.createReadStream(fileOrPath, {
        highWaterMark: this.options.chunkSize
      });

      for await (const rawChunk of fileStream) {
        if (this.state === TransferState.CANCELLED || this.state === TransferState.FAILED) {
          fileStream.destroy();
          return;
        }

        while (this.state === TransferState.PAUSED) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (currentChunkSeq < resumeFromSeq) {
          currentChunkSeq++;
          continue;
        }

        isLast = currentChunkSeq === this.totalChunks;
        await this._dispatchChunkPacket(rawChunk, currentChunkSeq, isLast);
        currentChunkSeq++;
      }
    } else {
      const file = fileOrPath;
      let offset = 0;

      while (offset < this.fileSize) {
        if (this.state === TransferState.CANCELLED || this.state === TransferState.FAILED) {
          return;
        }

        while (this.state === TransferState.PAUSED) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (currentChunkSeq < resumeFromSeq) {
          offset += this.options.chunkSize;
          currentChunkSeq++;
          continue;
        }

        const slice = file.slice(offset, offset + this.options.chunkSize);
        const arrayBuffer = await slice.arrayBuffer();
        const rawChunk = Buffer.from(arrayBuffer);

        isLast = currentChunkSeq === this.totalChunks || offset + rawChunk.length >= this.fileSize;
        await this._dispatchChunkPacket(rawChunk, currentChunkSeq, isLast);

        offset += this.options.chunkSize;
        currentChunkSeq++;
      }
    }

    while (this.unackedPackets.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 20));
      this._checkAckTimeouts();
      if (this.state === TransferState.CANCELLED || this.state === TransferState.FAILED) {
        return;
      }
    }

    const endPacket = {
      type: PacketType.FILE_END,
      seq: currentChunkSeq,
      payload: Buffer.from(JSON.stringify({ sha256: this.sha256 }), 'utf-8')
    };
    await this.transport.send(encodePacket(endPacket));

    this._setState(TransferState.VERIFYING);
    this._setState(TransferState.COMPLETED);
    this.emitEvent(EventNames.TRANSFER_COMPLETED, this.getMetrics());
  }

  async _dispatchChunkPacket(rawChunk, seq, isLast) {
    const packet = {
      type: PacketType.DATA,
      flags: isLast ? PacketFlags.LAST_CHUNK : PacketFlags.NONE,
      seq,
      payload: rawChunk
    };

    while (this.unackedPackets.size >= this.options.windowSize || this.receiverWindow === 0) {
      await new Promise(resolve => queueMicrotask(resolve));
      this._checkAckTimeouts();
      if (this.state === TransferState.CANCELLED || this.state === TransferState.FAILED) {
        return;
      }
    }

    this.unackedPackets.set(seq, {
      packet,
      timestamp: Date.now(),
      retries: 0
    });

    this.stats.packetsSent++;
    await this.transport.send(encodePacket(packet));
    this._updateMetrics();
    this.emitEvent(EventNames.TRANSFER_PROGRESS, this.getMetrics());
  }

  _checkAckTimeouts() {
    const now = Date.now();
    for (const [seq, item] of this.unackedPackets.entries()) {
      if (now - item.timestamp > this.options.ackTimeoutMs) {
        this._retransmitSeq(seq, 'ACK timeout');
      }
    }
  }

  _updateMetrics() {
    if (!this.stats.startTime) return;
    const elapsedSec = (Date.now() - this.stats.startTime) / 1000;
    if (elapsedSec > 0) {
      this.stats.averageSpeed = Math.round((this.stats.bytesTransferred * 8) / elapsedSec);
      this.stats.currentSpeed = this.stats.averageSpeed;
      const remainingBytes = this.fileSize - this.stats.bytesTransferred;
      this.stats.eta = this.stats.averageSpeed > 0 ? Math.ceil((remainingBytes * 8) / this.stats.averageSpeed) : 0;
    }
  }

  getMetrics() {
    return {
      transferId: this.transferId,
      senderId: this.options.senderId,
      targetReceiverId: this.options.targetReceiverId,
      state: this.state,
      fileSize: this.fileSize,
      bytesTransferred: this.stats.bytesTransferred,
      currentSpeedMbps: (this.stats.currentSpeed / 1_000_000).toFixed(2),
      averageSpeedMbps: (this.stats.averageSpeed / 1_000_000).toFixed(2),
      etaSeconds: this.stats.eta,
      packetsSent: this.stats.packetsSent,
      packetsAcked: this.stats.packetsAcked,
      packetsRetransmitted: this.stats.packetsRetransmitted,
      progressPercent: this.fileSize > 0 ? ((this.stats.bytesTransferred / this.fileSize) * 100).toFixed(1) : 0
    };
  }

  pause() {
    if (this.state === TransferState.TRANSFERRING) {
      this._setState(TransferState.PAUSED);
      this.transport.send(encodePacket({ type: PacketType.PAUSE, seq: 0 }));
      this.emitEvent(EventNames.TRANSFER_PAUSED, { transferId: this.transferId });
    }
  }

  resume() {
    if (this.state === TransferState.PAUSED) {
      this._setState(TransferState.TRANSFERRING);
      this.transport.send(encodePacket({ type: PacketType.RESUME, seq: 0 }));
      this.emitEvent(EventNames.TRANSFER_RESUMED, { transferId: this.transferId });
    }
  }

  cancel() {
    this._setState(TransferState.CANCELLED);
    this.transport.send(encodePacket({ type: PacketType.CANCEL, seq: 0 }));
    this.emitEvent(EventNames.TRANSFER_CANCELLED, { transferId: this.transferId });
  }

  _failTransfer(reason) {
    this._setState(TransferState.FAILED);
    this.emitEvent(EventNames.TRANSFER_FAILED, { transferId: this.transferId, reason });
  }

  _setState(newState) {
    this.state = newState;
    this.emit('stateChange', newState);
  }

  async _calculateSHA256(fileOrPath, filename) {
    if (typeof fileOrPath === 'string') {
      return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(fileOrPath);
        stream.on('data', data => {
          if (this.state === TransferState.CANCELLED || this.state === TransferState.FAILED) {
            stream.destroy();
            reject(new Error('Transfer cancelled'));
            return;
          }
          hash.update(data);
        });
        stream.on('end', () => {
          if (this.state === TransferState.CANCELLED || this.state === TransferState.FAILED) {
            reject(new Error('Transfer cancelled'));
          } else {
            resolve(hash.digest('hex'));
          }
        });
        stream.on('error', reject);
      });
    } else {
      const hash = crypto.createHash('sha256');
      const file = fileOrPath;
      const chunkSize = 2 * 1024 * 1024; // 2 MB chunks
      let offset = 0;

      while (offset < file.size) {
        if (this.state === TransferState.CANCELLED || this.state === TransferState.FAILED) {
          throw new Error('Transfer cancelled');
        }

        const slice = file.slice(offset, offset + chunkSize);
        const arrayBuffer = await slice.arrayBuffer();

        if (this.state === TransferState.CANCELLED || this.state === TransferState.FAILED) {
          throw new Error('Transfer cancelled');
        }

        hash.update(Buffer.from(arrayBuffer));
        offset += chunkSize;

        const percent = Math.min(100, ((offset / file.size) * 100).toFixed(1));
        this.emitEvent('hashProgress', {
          filename,
          size: file.size,
          bytesHashed: Math.min(file.size, offset),
          percent
        });
      }
      return hash.digest('hex');
    }
  }
}
