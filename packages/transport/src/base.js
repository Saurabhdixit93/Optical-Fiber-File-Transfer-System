import { TypedEventEmitter, LinkStatus } from '@optical/shared';

export class BaseTransport extends TypedEventEmitter {
  constructor(name = 'Transport') {
    super();
    this.name = name;
    this.status = LinkStatus.DISCONNECTED;
    this.stats = {
      bytesSent: 0,
      bytesReceived: 0,
      packetsSent: 0,
      packetsReceived: 0,
      packetsLost: 0,
      crcErrors: 0,
      retransmissions: 0,
      uptimeSeconds: 0
    };
    this.startTime = null;
  }

  async connect() {
    throw new Error('connect() must be implemented by transport subclass');
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented by transport subclass');
  }

  async send(data) {
    throw new Error('send() must be implemented by transport subclass');
  }

  getStatus() {
    return this.status;
  }

  getStatistics() {
    if (this.startTime && this.status === LinkStatus.ACTIVE) {
      this.stats.uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    }
    return { ...this.stats };
  }

  resetStatistics() {
    this.stats = {
      bytesSent: 0,
      bytesReceived: 0,
      packetsSent: 0,
      packetsReceived: 0,
      packetsLost: 0,
      crcErrors: 0,
      retransmissions: 0,
      uptimeSeconds: 0
    };
  }
}
