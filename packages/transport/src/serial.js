import { BaseTransport } from './base.js';
import { LinkStatus, EventNames } from '@optical/shared';

export class SerialTransport extends BaseTransport {
  constructor(options = {}) {
    super('SerialTransport');
    this.portName = options.portName || '/dev/ttyUSB0';
    this.baudRate = options.baudRate || 115200;
    this.deviceInfo = {
      deviceId: 'OPT-FIBER-USB-v1.0',
      firmwareVersion: '1.2.0',
      supportedSpeed: '1.00 Gbps',
      protocolVersion: 1
    };
  }

  async connect() {
    this.status = LinkStatus.SEARCHING;
    this.emitEvent(EventNames.LINK_CHANGED, { status: this.status });

    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulated physical USB Optical Transceiver connection setup
    this.status = LinkStatus.ACTIVE;
    this.startTime = Date.now();
    this.emitEvent(EventNames.DEVICE_CONNECTED, this.deviceInfo);
    this.emitEvent(EventNames.LINK_CHANGED, { status: this.status });
  }

  async disconnect() {
    this.status = LinkStatus.DISCONNECTED;
    this.startTime = null;
    this.emitEvent(EventNames.DEVICE_DISCONNECTED, { port: this.portName });
    this.emitEvent(EventNames.LINK_CHANGED, { status: this.status });
  }

  async send(buffer) {
    if (this.status !== LinkStatus.ACTIVE) {
      throw new Error('SerialTransport is not connected');
    }
    this.stats.bytesSent += buffer.length;
    this.stats.packetsSent++;
    return true;
  }
}
