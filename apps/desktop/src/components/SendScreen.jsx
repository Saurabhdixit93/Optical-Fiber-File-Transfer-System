import React, { useState, useRef } from 'react';
import { UploadCloud, File, Trash2, Play, FolderPlus, PlusCircle, ShieldCheck, UserCheck, QrCode, CheckCircle2 } from 'lucide-react';
import QRCodeModal from './QRCodeModal';

export default function SendScreen({ onStartSend, targetReceiverId, setTargetReceiverId }) {
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

  const totalBytes = fileList.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-mono">
      {/* Target Receiver ID & QR Scanner Selection Box */}
      <div className="bg-[#131b2e] border border-[#243252] p-5 rounded-xl space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <label className="text-gray-300 font-bold flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            TARGET RECEIVER DEVICE ID (SELECT ANY OR SPECIFIC NODE):
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
            <option value="ANY">ANY (Broadcast / Accept Any Receiver)</option>
            <option value="OPT-NODE-RECEIVER-90B1">OPT-NODE-RECEIVER-90B1 (Default Receiver)</option>
            <option value="OPT-NODE-ALPHA">OPT-NODE-ALPHA (Secondary Node)</option>
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
        className={`bg-[#131b2e] border-2 border-dashed p-10 rounded-xl text-center space-y-4 cursor-pointer transition-all ${
          isDragging
            ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
            : 'border-[#243252] hover:border-cyan-500/50'
        }`}
      >
        <div className="mx-auto w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <UploadCloud className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-100">
            {isDragging ? 'Drop Your Real Files Now' : 'Drag & Drop Your Real Files Here'}
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Files will be encrypted and transmitted strictly to Receiver <span className="text-cyan-400 font-bold">{targetReceiverId}</span>
          </p>
        </div>

        <div className="flex justify-center space-x-3 pt-2" onClick={(e) => e.stopPropagation()}>
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
      <div className="bg-[#131b2e] border border-[#243252] p-6 rounded-xl space-y-4">
        <div className="flex justify-between items-center border-b border-[#243252] pb-3">
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
                className="flex items-center justify-between bg-[#0d1322] p-3 rounded-lg border border-[#243252] font-mono text-xs hover:border-cyan-500/30 transition-colors"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <File className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="font-semibold text-gray-200 truncate">{item.name}</span>
                </div>
                <div className="flex items-center space-x-4 flex-shrink-0">
                  <span className="text-gray-400">{item.sizeText}</span>
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

        <div className="pt-4 flex justify-end space-x-3">
          <button
            onClick={() => fileList.length > 0 && onStartSend(fileList[0].fileObj || fileList[0])}
            disabled={fileList.length === 0}
            className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono text-xs px-6 py-3 rounded-lg shadow-lg disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Send to Receiver {targetReceiverId}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
