/**
 * Browser & Node compatible lightweight EventEmitter implementation
 */
export class SimpleEventEmitter {
  constructor() {
    this._listeners = new Map();
  }

  on(event, listener) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(listener);
    return this;
  }

  off(event, listener) {
    if (!this._listeners.has(event)) return this;
    const list = this._listeners.get(event).filter(l => l !== listener);
    this._listeners.set(event, list);
    return this;
  }

  emit(event, ...args) {
    if (!this._listeners.has(event)) return false;
    const list = [...this._listeners.get(event)];
    for (const listener of list) {
      listener(...args);
    }
    return true;
  }

  removeAllListeners(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }
}

export class TypedEventEmitter extends SimpleEventEmitter {
  emitEvent(eventName, payload) {
    this.emit(eventName, {
      type: eventName,
      timestamp: Date.now(),
      payload
    });
  }
}

export const EventNames = Object.freeze({
  DEVICE_CONNECTED: 'deviceConnected',
  DEVICE_DISCONNECTED: 'deviceDisconnected',
  TRANSFER_CREATED: 'transferCreated',
  TRANSFER_STARTED: 'transferStarted',
  TRANSFER_PAUSED: 'transferPaused',
  TRANSFER_RESUMED: 'transferResumed',
  TRANSFER_PROGRESS: 'transferProgress',
  TRANSFER_COMPLETED: 'transferCompleted',
  TRANSFER_FAILED: 'transferFailed',
  TRANSFER_CANCELLED: 'transferCancelled',
  PACKET_SENT: 'packetSent',
  PACKET_RECEIVED: 'packetReceived',
  PACKET_RETRANSMITTED: 'packetRetransmitted',
  LINK_CHANGED: 'linkChanged',
  ERROR_OCCURRED: 'errorOccurred'
});
