import { BaseTransport } from './base.js';
import { LinkStatus, EventNames } from '@optical/shared';

export class SimulationTransport extends BaseTransport {
  constructor(options = {}) {
    super('SimulationTransport');
    this.peer = null;
    this.options = {
      latencyMs: options.latencyMs || 2,
      lossRate: options.lossRate || 0,        // 0.0 to 1.0 (e.g. 0.01 = 1%)
      corruptionRate: options.corruptionRate || 0, // 0.0 to 1.0
      bandwidthMbps: options.bandwidthMbps || 1000,
      autoConnect: options.autoConnect ?? true
    };
  }

  pair(peerTransport) {
    this.peer = peerTransport;
    peerTransport.peer = this;
  }

  async connect() {
    this.status = LinkStatus.CONNECTING;
    this.emitEvent(EventNames.LINK_CHANGED, { status: this.status });

    await new Promise(resolve => setTimeout(resolve, 50));

    this.status = LinkStatus.ACTIVE;
    this.startTime = Date.now();
    this.emitEvent(EventNames.LINK_CHANGED, { status: this.status });

    if (this.peer && this.peer.status !== LinkStatus.ACTIVE && this.options.autoConnect) {
      await this.peer.connect();
    }
  }

  async disconnect() {
    this.status = LinkStatus.DISCONNECTED;
    this.startTime = null;
    this.emitEvent(EventNames.LINK_CHANGED, { status: this.status });
  }

  /**
   * Simulates sending a packet frame over the optical simulation link.
   * @param {Buffer} buffer
   */
  async send(buffer) {
    if (this.status !== LinkStatus.ACTIVE) {
      throw new Error('SimulationTransport is not ACTIVE');
    }

    if (!this.peer || this.peer.status !== LinkStatus.ACTIVE) {
      this.stats.packetsLost++;
      return false;
    }

    this.stats.bytesSent += buffer.length;
    this.stats.packetsSent++;

    // Simulated packet loss check
    if (this.options.lossRate > 0 && Math.random() < this.options.lossRate) {
      this.stats.packetsLost++;
      this.emitEvent(EventNames.PACKET_RETRANSMITTED, { reason: 'Simulated packet loss' });
      return false; // Packet dropped in simulation
    }

    // Clone payload buffer to avoid reference mutation
    let sendBuffer = Buffer.from(buffer);

    // Simulated corruption check (flip a random bit)
    if (this.options.corruptionRate > 0 && Math.random() < this.options.corruptionRate) {
      if (sendBuffer.length > 5) {
        const corruptIdx = Math.floor(Math.random() * sendBuffer.length);
        sendBuffer[corruptIdx] ^= 0xFF; // Flip bit
        this.stats.crcErrors++;
      }
    }

    // Calculate bandwidth delay if configured
    const bits = sendBuffer.length * 8;
    const sendTimeMs = (bits / (this.options.bandwidthMbps * 1_000_000)) * 1000;
    const totalDelayMs = (this.options.latencyMs || 0) + sendTimeMs;

    if (totalDelayMs < 3) {
      // Direct optical sub-ms propagation - use microtask to bypass browser 15ms setTimeout throttling
      queueMicrotask(() => {
        if (this.peer && this.peer.status === LinkStatus.ACTIVE) {
          this.peer._receiveData(sendBuffer);
        }
      });
    } else {
      setTimeout(() => {
        if (this.peer && this.peer.status === LinkStatus.ACTIVE) {
          this.peer._receiveData(sendBuffer);
        }
      }, Math.round(totalDelayMs));
    }

    return true;
  }

  _receiveData(buffer) {
    this.stats.bytesReceived += buffer.length;
    this.stats.packetsReceived++;
    this.emit('data', buffer);
    this.emitEvent(EventNames.PACKET_RECEIVED, { bytes: buffer.length });
  }

  setOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }
}
