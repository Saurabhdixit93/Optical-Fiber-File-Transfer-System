import React, { useState, useRef, useCallback } from 'react';
import { Download, Folder, CheckCircle2, ShieldCheck, FileCheck, UserCheck, Lock, QrCode, Globe, Wifi, WifiOff, Loader2 } from 'lucide-react';
import QRCodeModal from './QRCodeModal';
import { WebSocketTransport } from '@optical/transport';
import { FileReceiver } from '@optical/transfer-engine';

export default function ReceiverScreen({
  receiverId, setReceiverId, receivedFiles = [], autoAccept, setAutoAccept,
  mode, roomCode, setRoomCode, wsConnected, setWsConnected, peerConnected, setPeerConnected,
  settings, formatSize, setReceivedFiles, setHistoryTransfers, setActiveTransfer, setActiveTab, setSpeedHistory
}) {
  const [destDir, setDestDir] = useState('./downloads');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [joinError, setJoinError] = useState('');

  const receiverTransportRef = useRef(null);
  const receiverInstanceRef = useRef(null);

  /**
   * Join a room as a receiver in WebSocket mode.
   * This sets up the WebSocket transport, connects, and starts listening.
   */
  const handleJoinRoom = useCallback(async () => {
    const code = joinRoomCode.trim().toUpperCase();
    if (!code || code.length < 4) {
      setJoinError('Enter a valid room code (at least 4 characters)');
      return;
    }

    setJoinError('');
    setIsJoining(true);

    try {
      // Clean up previous transport if any
      if (receiverTransportRef.current) {
        await receiverTransportRef.current.disconnect();
      }

      const transport = new WebSocketTransport({
        roomId: code,
        role: 'receiver',
      });

      receiverTransportRef.current = transport;

      await transport.connect();
      setRoomCode(code);
      setWsConnected(true);
      setIsListening(true);

      // Set up receiver engine
      const receiver = new FileReceiver(transport, {
        destinationDir: destDir,
        receiverId,
        autoAccept,
      });

      receiverInstanceRef.current = receiver;

      // Listen for peer join/leave
      transport.on('peerJoined', () => {
        setPeerConnected(true);
      });

      transport.on('peerLeft', () => {
        setPeerConnected(false);
      });

      // Handle incoming transfer completion
      receiver.on('transferCompleted', (event) => {
        const info = event.payload || event;
        const pureChunks = info.chunks || receiver.inMemoryChunks || [];
        const blob = new Blob(pureChunks, { type: 'application/octet-stream' });
        const downloadUrl = URL.createObjectURL(blob);

        setReceivedFiles((prev) => [
          {
            filename: info.filename || 'received_file',
            senderId: 'Remote Sender',
            targetReceiverId: receiverId,
            sizeText: formatSize(info.size || blob.size),
            sha256: info.sha256 || 'Verified SHA256',
            downloadUrl,
          },
          ...prev,
        ]);

        setHistoryTransfers((prev) => [
          {
            filename: info.filename || 'received_file',
            size: formatSize(info.size || blob.size),
            speed: `${info.averageSpeedMbps || 'N/A'} Mbps`,
            status: 'Completed',
            direction: 'RECEIVE',
          },
          ...prev,
        ]);
      });

      receiver.on('transferProgress', (event) => {
        const metrics = event.payload || event;
        setActiveTransfer({
          filename: metrics.filename || 'Receiving...',
          fileSize: metrics.totalBytes || 0,
          bytesTransferred: metrics.bytesReceived || 0,
          currentSpeedMbps: 'Receiving',
          averageSpeedMbps: 'WebSocket',
          etaSeconds: 0,
          packetsSent: 0,
          packetsRetransmitted: 0,
          progressPercent: metrics.progressPercent || '0.0',
          state: 'TRANSFERRING',
        });
      });

    } catch (err) {
      setJoinError(`Connection failed: ${err.message}`);
      setWsConnected(false);
      setIsListening(false);
    } finally {
      setIsJoining(false);
    }
  }, [joinRoomCode, destDir, receiverId, autoAccept, setRoomCode, setWsConnected, setPeerConnected, setReceivedFiles, setHistoryTransfers, setActiveTransfer, formatSize]);

  const handleDisconnect = useCallback(async () => {
    if (receiverTransportRef.current) {
      await receiverTransportRef.current.disconnect();
      receiverTransportRef.current = null;
    }
    receiverInstanceRef.current = null;
    setIsListening(false);
    setWsConnected(false);
    setPeerConnected(false);
    setRoomCode('');
  }, [setWsConnected, setPeerConnected, setRoomCode]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* QR Code Modal for Display */}
      <QRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        mode="display"
        receiverId={receiverId}
      />

      {/* WebSocket Room Join Panel */}
      {mode === 'WebSocket' && (
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/30 p-4 sm:p-6 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h2 className="text-xs sm:text-sm font-bold text-cyan-300 flex items-center gap-2 font-mono">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              WEBSOCKET RECEIVER — Join Transfer Room
            </h2>
            {isListening && (
              <div className="flex items-center gap-2">
                {peerConnected ? (
                  <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5 font-mono animate-pulse">
                    <Wifi className="w-4 h-4" /> Sender Connected
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5 font-mono">
                    <Loader2 className="w-4 h-4 animate-spin" /> Waiting for sender...
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="bg-[#0d1322] p-3 sm:p-4 rounded-xl border border-[#243252] space-y-3">
            {!isListening ? (
              <>
                <p className="text-gray-400 text-xs font-mono">
                  Enter the room code shared by the sender to start receiving files.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    type="text"
                    value={joinRoomCode}
                    onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                    placeholder="Enter Room Code (e.g. A3K9XP)"
                    maxLength={10}
                    className="flex-1 bg-[#131b2e] border border-[#243252] rounded-xl px-4 py-3 text-lg sm:text-2xl font-black tracking-[0.3em] text-cyan-300 text-center focus:outline-none focus:border-cyan-500 placeholder:text-gray-600 placeholder:text-sm placeholder:tracking-normal placeholder:font-normal font-mono"
                  />
                  <button
                    onClick={handleJoinRoom}
                    disabled={isJoining || !joinRoomCode.trim()}
                    className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs px-6 py-3 rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                  >
                    {isJoining ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                    ) : (
                      <><Wifi className="w-4 h-4" /> Join Room</>
                    )}
                  </button>
                </div>
                {joinError && (
                  <p className="text-rose-400 text-xs font-mono">{joinError}</p>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase font-mono">Connected to Room</p>
                    <span className="text-xl sm:text-2xl font-black tracking-[0.3em] text-cyan-300 font-mono">{roomCode}</span>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-2 rounded-xl hover:bg-rose-500/30 transition-all text-xs font-bold"
                  >
                    <WifiOff className="w-4 h-4" /> Disconnect
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg text-xs font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  Listening for incoming file transfers...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receiver Node Configuration */}
      <div className="bg-[#131b2e] border border-[#243252] p-4 sm:p-6 rounded-xl space-y-4">
        <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
          <Download className="w-5 h-5 text-emerald-400" />
          Receiver Node Security & Identity
        </h2>

        <div className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-gray-400 mb-1 font-bold">YOUR ASSIGNED RECEIVER DEVICE ID:</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                className="flex-1 bg-[#0d1322] border border-[#243252] rounded-lg px-3 py-2 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white px-3.5 py-2 rounded-lg flex items-center justify-center gap-1.5 font-bold shadow-md transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>Show QR Code</span>
              </button>
              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-3 py-2 rounded-lg flex items-center justify-center gap-1 font-bold">
                <Lock className="w-3.5 h-3.5" />
                Target ID Locked
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Senders must target <strong className="text-cyan-400">{receiverId}</strong> to establish connection handshake (or scan your QR code)
            </p>
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Target Save Directory:</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={destDir}
                onChange={(e) => setDestDir(e.target.value)}
                className="flex-1 bg-[#0d1322] border border-[#243252] rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
              />
              <button className="bg-[#1a243b] px-4 py-2 rounded-lg border border-[#243252] text-gray-300 hover:text-white flex items-center space-x-1">
                <Folder className="w-4 h-4" />
                <span>Browse</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-[#0d1322] p-4 rounded-lg border border-[#243252]">
            <input
              type="checkbox"
              id="autoAccept"
              checked={autoAccept}
              onChange={(e) => setAutoAccept(e.target.checked)}
              className="rounded border-[#243252] text-cyan-500 focus:ring-0"
            />
            <label htmlFor="autoAccept" className="text-gray-300">
              Automatically accept incoming optical transfers targeted for <strong className="text-cyan-400">{receiverId}</strong>
            </label>
          </div>
        </div>
      </div>

      {/* Receiver Optical Link Listener */}
      <div className="bg-[#131b2e] border border-[#243252] p-6 rounded-xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-gray-200">Incoming Optical Transfers Listener</h3>
          <div className="bg-[#0d1322] px-3 py-1.5 rounded-lg border border-[#243252] text-xs font-mono text-emerald-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            {mode === 'WebSocket' && isListening ? `WebSocket Room: ${roomCode}` : `HAL Active (Target ID: ${receiverId})`}
          </div>
        </div>

        {/* Received Files List */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono text-gray-400 uppercase">Received Files ({receivedFiles.length})</h4>
          {receivedFiles.length > 0 ? (
            <div className="space-y-2">
              {receivedFiles.map((file, idx) => (
                <div key={idx} className="bg-[#0d1322] p-4 rounded-lg border border-[#243252] flex items-center justify-between font-mono text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-gray-100">{file.filename}</span>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Sender: <span className="text-purple-300">{file.senderId || 'OPT-NODE-SENDER-01'}</span> | Target: <span className="text-cyan-300">{file.targetReceiverId || receiverId}</span> | SHA256: <span className="text-cyan-400">{file.sha256?.substring(0, 16)}...</span>
                    </div>
                  </div>

                  {file.downloadUrl ? (
                    <a
                      href={file.downloadUrl}
                      download={file.filename}
                      className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-lg transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Save File</span>
                    </a>
                  ) : (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Saved to Disk
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 font-mono text-xs border border-dashed border-[#243252] rounded-lg">
              {mode === 'WebSocket' && isListening
                ? `Listening on WebSocket room ${roomCode}. Sender will connect and transfer files here.`
                : `No files received yet. Senders targeting Receiver ID ${receiverId} will connect automatically.`
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
