import React, { useState, useRef } from 'react';
import { UploadCloud, File, Trash2, Play, FolderPlus, PlusCircle, ShieldCheck, UserCheck, QrCode, CheckCircle2, Globe, Copy, Check, Link } from 'lucide-react';
import QRCodeModal from './QRCodeModal';

export default function SendScreen({ onStartSend, targetReceiverId, setTargetReceiverId, mode, roomCode, generateNewRoomCode, wsConnected, peerConnected }) {
  const [fileList, setFileList] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [pairedSuccess, setPairedSuccess] = useState(false);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const addFiles = (incomingFiles) => {
    if (!incomingFiles || incomingFiles.length === 0) return;

    const newItems = Array.from(incomingFiles).map(file => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      sizeText: formatSize(file.size),
      type: file.type || 'Binary file',
      fileObj: file
    }));

    setFileList(prev => [...prev, ...newItems]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const removeItem = (id) => {
    setFileList(fileList.filter(f => f.id !== id));
  };

  const clearQueue = () => {
    setFileList([]);
  };

  const handlePairSuccess = (newReceiverId) => {
    setTargetReceiverId(newReceiverId);
    setPairedSuccess(true);
    setTimeout(() => setPairedSuccess(false), 3000);
  };

  const [copiedRoom, setCopiedRoom] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const totalBytes = fileList.reduce((acc, f) => acc + f.size, 0);

  const handleCopyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopiedRoom(true);
    setTimeout(() => setCopiedRoom(false), 2000);
  };

  const handleCopyLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto font-mono">
      {/* WebSocket Room Code Panel */}
      {mode === 'WebSocket' && (
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/30 p-4 sm:p-5 rounded-xl space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <label className="text-cyan-300 font-bold flex items-center gap-2 text-xs sm:text-sm">
              <Globe className="w-4 h-4 flex-shrink-0" />
              WEBSOCKET TRANSFER MODE — Room Pairing
            </label>
            {peerConnected && (
              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-4 h-4" /> Peer Connected!
              </span>
            )}
          </div>

          <div className="bg-[#0d1322] p-3 sm:p-4 rounded-xl border border-[#243252] space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-gray-400 text-[10px] uppercase mb-1">Room Code (Share with receiver)</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-black tracking-[0.3em] text-cyan-300">
                    {roomCode || '------'}
                  </span>
                  {!roomCode && (
                    <button
                      onClick={generateNewRoomCode}
                      className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-lg hover:bg-cyan-500/30 transition-all font-bold"
                    >
                      Generate Code
                    </button>
                  )}
                </div>
              </div>
              {roomCode && (
                <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleCopyRoomCode}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#1a243b] hover:bg-[#243252] text-cyan-300 text-xs px-3 py-2 rounded-lg border border-cyan-500/30 transition-all"
                  >
                    {copiedRoom ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedRoom ? 'Copied!' : 'Copy Code'}
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#1a243b] hover:bg-[#243252] text-purple-300 text-xs px-3 py-2 rounded-lg border border-purple-500/30 transition-all"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              )}
            </div>
            <p className="text-gray-500 text-[10px]">
              Share this room code or link with the receiver. They will enter it on their Receiver page to join this transfer session.
            </p>
          </div>
        </div>
      )}

      {/* Target Receiver ID & QR Scanner Selection Box */}
      <div className="bg-[#131b2e] border border-[#243252] p-4 sm:p-5 rounded-xl space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <label className="text-gray-300 font-bold flex items-center gap-2 text-[11px] sm:text-xs">
            <UserCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            TARGET RECEIVER DEVICE ID:
          </label>

          {pairedSuccess && (
            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 animate-pulse">
              <CheckCircle2 className="w-4 h-4" /> QR Paired!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Target Receiver Dropdown Selector */}
          <select
            value={
              ['ANY', 'OPT-NODE-RECEIVER-90B1', 'OPT-NODE-ALPHA'].includes(targetReceiverId)
                ? targetReceiverId
                : 'CUSTOM'
            }
            onChange={(e) => {
              if (e.target.value !== 'CUSTOM') {
                setTargetReceiverId(e.target.value);
              }
            }}
            className="bg-[#0d1322] border border-[#243252] rounded-xl px-3 py-2.5 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="ANY">ANY (Accept Any Receiver)</option>
            <option value="OPT-NODE-RECEIVER-90B1">OPT-NODE-RECEIVER-90B1</option>
            <option value="OPT-NODE-ALPHA">OPT-NODE-ALPHA</option>
            <option value="CUSTOM">Custom ID / Scanned QR...</option>
          </select>

          {/* Editable Target Receiver Input */}
          <input
            type="text"
            value={targetReceiverId}
            onChange={(e) => setTargetReceiverId(e.target.value)}
            placeholder="Enter Target Receiver Device ID"
            className="bg-[#0d1322] border border-[#243252] rounded-xl px-3 py-2.5 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
          />

          {/* Scan QR Button */}
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan QR Code</span>
          </button>
        </div>
      </div>

      {/* QR Code Scanner Modal */}
      <QRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        mode="scan"
        onPairSuccess={handlePairSuccess}
      />

      {/* Hidden File Inputs */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={(e) => addFiles(e.target.files)}
        className="hidden"
      />
      <input
        type="file"
        webkitdirectory="true"
        directory="true"
        ref={folderInputRef}
        onChange={(e) => addFiles(e.target.files)}
        className="hidden"
      />

      {/* HTML5 Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        className={`bg-[#131b2e] border-2 border-dashed p-6 sm:p-10 rounded-xl text-center space-y-4 cursor-pointer transition-all ${
          isDragging
            ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
            : 'border-[#243252] hover:border-cyan-500/50'
        }`}
      >
        <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <UploadCloud className="w-6 h-6 sm:w-8 sm:h-8" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-100">
            {isDragging ? 'Drop Your Real Files Now' : 'Drag & Drop Your Real Files Here'}
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-400 font-mono mt-1">
            Files will be transmitted strictly to Target <span className="text-cyan-400 font-bold">{targetReceiverId}</span>
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="flex items-center space-x-2 bg-[#1a243b] hover:bg-[#243252] text-cyan-300 font-mono text-xs px-4 py-2 rounded-lg border border-cyan-500/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Select Files</span>
          </button>

          <button
            type="button"
            onClick={() => folderInputRef.current && folderInputRef.current.click()}
            className="flex items-center space-x-2 bg-[#1a243b] hover:bg-[#243252] text-purple-300 font-mono text-xs px-4 py-2 rounded-lg border border-purple-500/30"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Select Folder</span>
          </button>
        </div>
      </div>

      {/* Queue List */}
      <div className="bg-[#131b2e] border border-[#243252] p-4 sm:p-6 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#243252] pb-3 gap-2">
          <h3 className="font-bold text-sm text-gray-200">
            Selected Transfer Queue ({fileList.length})
          </h3>
          <div className="flex items-center space-x-4">
            <span className="text-xs font-mono text-cyan-400">
              Total Payload: {formatSize(totalBytes)}
            </span>
            {fileList.length > 0 && (
              <button
                onClick={clearQueue}
                className="text-xs text-rose-400 hover:text-rose-300 font-mono underline"
              >
                Clear Queue
              </button>
            )}
          </div>
        </div>

        {fileList.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {fileList.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-[#0d1322] p-3 rounded-lg border border-[#243252] font-mono text-xs hover:border-cyan-500/30 transition-colors gap-2"
              >
                <div className="flex items-center space-x-3 overflow-hidden min-w-0">
                  <File className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="font-semibold text-gray-200 truncate max-w-[160px] sm:max-w-xs">{item.name}</span>
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0">
                  <span className="text-gray-400 text-[11px] sm:text-xs">{item.sizeText}</span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-rose-400 hover:text-rose-300 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 font-mono text-xs border border-dashed border-[#243252] rounded-lg">
            No real files queued yet. Drag & drop files above or click "Select Files".
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => fileList.length > 0 && onStartSend(fileList[0].fileObj || fileList[0])}
            disabled={fileList.length === 0}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono text-xs px-6 py-3 rounded-lg shadow-lg disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span className="truncate">Send to Receiver {targetReceiverId}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
