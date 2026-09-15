import React, { useState } from 'react';
import { Download, Folder, CheckCircle2, ShieldCheck, FileCheck, UserCheck, Lock, QrCode } from 'lucide-react';
import QRCodeModal from './QRCodeModal';

export default function ReceiverScreen({ receiverId, setReceiverId, receivedFiles = [], autoAccept, setAutoAccept }) {
  const [destDir, setDestDir] = useState('./downloads');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* QR Code Modal for Display */}
      <QRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        mode="display"
        receiverId={receiverId}
      />

      {/* Receiver Node Configuration */}
      <div className="bg-[#131b2e] border border-[#243252] p-6 rounded-xl space-y-4">
        <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
          <Download className="w-5 h-5 text-emerald-400" />
          Receiver Node Security & Identity
        </h2>

        <div className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-gray-400 mb-1 font-bold">YOUR ASSIGNED RECEIVER DEVICE ID:</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                className="flex-1 bg-[#0d1322] border border-[#243252] rounded-lg px-3 py-2 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white px-3.5 py-2 rounded-lg flex items-center gap-1.5 font-bold shadow-md transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>Show QR Code</span>
              </button>
              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-3 py-2 rounded-lg flex items-center gap-1 font-bold">
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
            HAL Active (Target ID: {receiverId})
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
              No files received yet. Senders targeting Receiver ID <span className="text-cyan-400">{receiverId}</span> will connect automatically.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
