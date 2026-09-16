import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();
const server = createServer(app);

// ─── Health Check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    rooms: rooms.size,
    timestamp: new Date().toISOString()
  });
});

// ─── API: Active Rooms Info ─────────────────────────────────────────────────────
app.get('/api/rooms', (req, res) => {
  const roomList = [];
  for (const [roomId, room] of rooms.entries()) {
    roomList.push({
      roomId,
      sender: !!room.sender,
      receiver: !!room.receiver,
      createdAt: room.createdAt
    });
  }
  res.json({ rooms: roomList });
});

// ─── Serve Static Build ─────────────────────────────────────────────────────────
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── WebSocket Relay Server ─────────────────────────────────────────────────────

/**
 * Room structure:
 * {
 *   sender: WebSocket | null,
 *   receiver: WebSocket | null,
 *   createdAt: ISO string
 * }
 */
const rooms = new Map();

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  let clientRoom = null;
  let clientRole = null;

  ws.on('message', (data, isBinary) => {
    // ─── Text Messages: Control Protocol ──────────────────────────────────
    if (!isBinary && typeof data !== 'object') {
      try {
        const msg = JSON.parse(data.toString());
        handleControlMessage(ws, msg);
        clientRoom = msg.roomId || clientRoom;
        clientRole = msg.role || clientRole;
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON message' }));
      }
      return;
    }

    // Handle Buffer/ArrayBuffer text messages (Node ws sends Buffer even for text)
    if (!isBinary) {
      try {
        const str = data.toString();
        const msg = JSON.parse(str);
        handleControlMessage(ws, msg);
        clientRoom = msg.roomId || clientRoom;
        clientRole = msg.role || clientRole;
        return;
      } catch {
        // Not JSON, treat as binary relay below
      }
    }

    // ─── Binary Messages: Relay to Peer ───────────────────────────────────
    if (!clientRoom || !clientRole) return;

    const room = rooms.get(clientRoom);
    if (!room) return;

    const peer = clientRole === 'sender' ? room.receiver : room.sender;
    if (peer && peer.readyState === 1) { // WebSocket.OPEN
      peer.send(data);
    }
  });

  ws.on('close', () => {
    if (!clientRoom || !clientRole) return;

    const room = rooms.get(clientRoom);
    if (!room) return;

    // Clear this client from the room
    if (clientRole === 'sender' && room.sender === ws) {
      room.sender = null;
      // Notify receiver that sender left
      if (room.receiver && room.receiver.readyState === 1) {
        room.receiver.send(JSON.stringify({ type: 'peer-left', peerRole: 'sender' }));
      }
    } else if (clientRole === 'receiver' && room.receiver === ws) {
      room.receiver = null;
      // Notify sender that receiver left
      if (room.sender && room.sender.readyState === 1) {
        room.sender.send(JSON.stringify({ type: 'peer-left', peerRole: 'receiver' }));
      }
    }

    // Clean up empty rooms
    if (!room.sender && !room.receiver) {
      rooms.delete(clientRoom);
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS ERROR] ${err.message}`);
  });
});

function handleControlMessage(ws, msg) {
  if (msg.type === 'join') {
    const { roomId, role } = msg;

    if (!roomId || !role) {
      ws.send(JSON.stringify({ type: 'error', message: 'Missing roomId or role' }));
      return;
    }

    if (role !== 'sender' && role !== 'receiver') {
      ws.send(JSON.stringify({ type: 'error', message: 'Role must be sender or receiver' }));
      return;
    }

    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        sender: null,
        receiver: null,
        createdAt: new Date().toISOString()
      });
    }

    const room = rooms.get(roomId);

    // Check if role is already taken
    if (room[role] && room[role] !== ws && room[role].readyState === 1) {
      ws.send(JSON.stringify({
        type: 'error',
        message: `A ${role} is already connected in room ${roomId}`
      }));
      return;
    }

    // Assign client to room
    room[role] = ws;

    // Confirm room join
    ws.send(JSON.stringify({ type: 'room-joined', roomId, role }));

    // Notify both peers if the room is now complete
    const peerRole = role === 'sender' ? 'receiver' : 'sender';
    const peer = room[peerRole];

    if (peer && peer.readyState === 1) {
      // Notify the new joiner that peer is already present
      ws.send(JSON.stringify({ type: 'peer-joined', peerRole }));
      // Notify the existing peer about the new joiner
      peer.send(JSON.stringify({ type: 'peer-joined', peerRole: role }));
    }

    console.log(`[ROOM ${roomId}] ${role} joined. Sender: ${!!room.sender}, Receiver: ${!!room.receiver}`);
  }
}

// ─── Stale Room Cleanup (every 30 minutes) ──────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    const ageMs = now - new Date(room.createdAt).getTime();
    const isEmpty = !room.sender && !room.receiver;
    const isStale = ageMs > 2 * 60 * 60 * 1000; // 2 hours

    if (isEmpty || isStale) {
      // Close any remaining connections
      if (room.sender && room.sender.readyState === 1) {
        room.sender.close(1000, 'Room expired');
      }
      if (room.receiver && room.receiver.readyState === 1) {
        room.receiver.close(1000, 'Room expired');
      }
      rooms.delete(roomId);
      console.log(`[CLEANUP] Room ${roomId} removed (empty=${isEmpty}, stale=${isStale})`);
    }
  }
}, 30 * 60 * 1000);

// ─── Start Server ───────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║     Optical Fiber File Transfer System — Relay Server       ║
╠══════════════════════════════════════════════════════════════╣
║  HTTP Server:  http://0.0.0.0:${String(PORT).padEnd(5)}                          ║
║  WebSocket:    ws://0.0.0.0:${String(PORT).padEnd(5)}/ws                         ║
║  Health:       http://0.0.0.0:${String(PORT).padEnd(5)}/health                   ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
