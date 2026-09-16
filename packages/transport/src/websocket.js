import { BaseTransport } from './base.js';
import { LinkStatus, EventNames } from '@optical/shared';

/**
 * WebSocketTransport - Network transport layer using WebSocket relay server.
 * 
 * Implements the same BaseTransport interface as SimulationTransport,
 * enabling seamless drop-in replacement for real cross-device file transfers.
 * 
 * Protocol:
 *   1. Client connects to relay server via WebSocket
 *   2. Sends JSON: { type: "join", roomId: "xxx", role: "sender"|"receiver" }
 *   3. Server pairs sender/receiver in the same room
 *   4. All subsequent binary messages are relayed to the peer
 */
export class WebSocketTransport extends BaseTransport {
  constructor(options = {}) {
    super('WebSocketTransport');
    this.options = {
      wsUrl: options.wsUrl || WebSocketTransport.getDefaultWsUrl(),
      roomId: options.roomId || '',
      role: options.role || 'sender', // 'sender' or 'receiver'
      reconnectAttempts: options.reconnectAttempts || 3,
      reconnectDelayMs: options.reconnectDelayMs || 1000,
      ...options
    };
    this.ws = null;
    this.peerConnected = false;
    this._reconnectCount = 0;
    this._peerJoinedPromise = null;
    this._peerJoinedResolve = null;
  }

  /**
   * Auto-detect the WebSocket URL based on the current page location.
   * Works both in browser (deployed) and Node.js (testing) contexts.
   */
  static getDefaultWsUrl() {
    if (typeof window !== 'undefined' && window.location) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}`;
    }
    return 'ws://localhost:3000';
  }

  async connect() {
    if (this.status === LinkStatus.ACTIVE) return;

    this.status = LinkStatus.CONNECTING;
    this.emitEvent(EventNames.LINK_CHANGED, { status: this.status });

    return new Promise((resolve, reject) => {
      try {
        // Use native WebSocket (browser) — for Node.js, ensure 'ws' is loaded into globalThis.WebSocket
        const WebSocketImpl = typeof WebSocket !== 'undefined'
          ? WebSocket
          : (typeof globalThis !== 'undefined' && globalThis.WebSocket)
            ? globalThis.WebSocket
            : null;

        if (!WebSocketImpl) {
          reject(new Error('WebSocket is not available in this environment'));
          return;
        }

        this.ws = new WebSocketImpl(this.options.wsUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          // Join the room
          const joinMsg = JSON.stringify({
            type: 'join',
            roomId: this.options.roomId,
            role: this.options.role
          });
          this.ws.send(joinMsg);

          this.status = LinkStatus.ACTIVE;
          this.startTime = Date.now();
          this._reconnectCount = 0;
          this.emitEvent(EventNames.LINK_CHANGED, { status: this.status });
          resolve();
        };

        this.ws.onmessage = (event) => {
          const data = event.data;

          // Handle text messages (control protocol)
          if (typeof data === 'string') {
            try {
              const msg = JSON.parse(data);
              this._handleControlMessage(msg);
            } catch {
              // Ignore malformed control messages
            }
            return;
          }

          // Handle binary messages (packet data relay)
          const buffer = Buffer.from(data instanceof ArrayBuffer ? data : new Uint8Array(data));
          this._receiveData(buffer);
        };

        this.ws.onclose = (event) => {
          const wasActive = this.status === LinkStatus.ACTIVE;
          this.status = LinkStatus.DISCONNECTED;
          this.peerConnected = false;
          this.emitEvent(EventNames.LINK_CHANGED, { status: this.status, code: event.code });

          // Attempt reconnect if unexpected close
          if (wasActive && this._reconnectCount < this.options.reconnectAttempts) {
            this._attemptReconnect();
          }
        };

        this.ws.onerror = (err) => {
          if (this.status === LinkStatus.CONNECTING) {
            this.status = LinkStatus.ERROR;
            this.emitEvent(EventNames.LINK_CHANGED, { status: this.status });
            reject(new Error(`WebSocket connection failed to ${this.options.wsUrl}`));
          }
        };
      } catch (err) {
        this.status = LinkStatus.ERROR;
        this.emitEvent(EventNames.LINK_CHANGED, { status: this.status });
        reject(err);
      }
    });
  }

  _handleControlMessage(msg) {
    switch (msg.type) {
      case 'peer-joined':
        this.peerConnected = true;
        this.emit('peerJoined', { role: msg.peerRole });
        if (this._peerJoinedResolve) {
          this._peerJoinedResolve();
          this._peerJoinedResolve = null;
        }
        break;

      case 'peer-left':
        this.peerConnected = false;
        this.emit('peerLeft', {});
        break;

      case 'room-joined':
        this.emit('roomJoined', { roomId: msg.roomId, role: this.options.role });
        break;

      case 'error':
        this.emitEvent(EventNames.ERROR_OCCURRED, { message: msg.message });
        break;
    }
  }

  /**
   * Wait for the peer to connect to the room.
   * @param {number} timeoutMs - Maximum time to wait (default 120s)
   * @returns {Promise<void>}
   */
  async waitForPeer(timeoutMs = 120000) {
    if (this.peerConnected) return;

    return new Promise((resolve, reject) => {
      this._peerJoinedResolve = resolve;

      const timeout = setTimeout(() => {
        this._peerJoinedResolve = null;
        reject(new Error('Timeout waiting for peer to join room'));
      }, timeoutMs);

      // Clean up timeout if resolved
      const origResolve = this._peerJoinedResolve;
      this._peerJoinedResolve = () => {
        clearTimeout(timeout);
        origResolve();
      };
    });
  }

  async disconnect() {
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect on intentional close
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.status = LinkStatus.DISCONNECTED;
    this.peerConnected = false;
    this.startTime = null;
    this.emitEvent(EventNames.LINK_CHANGED, { status: this.status });
  }

  /**
   * Send a binary packet buffer to the peer via the WebSocket relay.
   * @param {Buffer} buffer
   * @returns {Promise<boolean>}
   */
  async send(buffer) {
    if (this.status !== LinkStatus.ACTIVE || !this.ws) {
      throw new Error('WebSocketTransport is not ACTIVE');
    }

    if (this.ws.readyState !== 1) { // WebSocket.OPEN = 1
      this.stats.packetsLost++;
      return false;
    }

    try {
      // Send as binary (ArrayBuffer for browser WebSocket compatibility)
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
      this.ws.send(arrayBuffer);

      this.stats.bytesSent += buffer.length;
      this.stats.packetsSent++;
      return true;
    } catch (err) {
      this.stats.packetsLost++;
      return false;
    }
  }

  _receiveData(buffer) {
    this.stats.bytesReceived += buffer.length;
    this.stats.packetsReceived++;
    this.emit('data', buffer);
    this.emitEvent(EventNames.PACKET_RECEIVED, { bytes: buffer.length });
  }

  async _attemptReconnect() {
    this._reconnectCount++;
    this.status = LinkStatus.CONNECTING;
    this.emitEvent(EventNames.LINK_CHANGED, { status: this.status });

    await new Promise(r => setTimeout(r, this.options.reconnectDelayMs));

    try {
      await this.connect();
    } catch {
      // Reconnect failed; will retry via onclose handler
    }
  }

  setOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }
}
