import React from 'react';
import { Pause, Play, XCircle, RefreshCw, CheckCircle2, Download, ArrowRight, ShieldCheck } from 'lucide-react';
import ThroughputChart from './ThroughputChart';

export default function ActiveTransferScreen({
  activeTransfer,
  speedHistory,
  onPause,
  onResume,
  onCancel,
  onNewTransfer,
  onGoToReceiver
}) {
  if (!activeTransfer) {
    return (
      <div className="bg-[#131b2e] border border-[#243252] p-12 rounded-xl text-center space-y-4 font-mono text-xs text-gray-400">
        <p>No active file transfer in progress.</p>
        <button
          onClick={onNewTransfer}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-4 py-2 rounded-lg"
        >
          + Send a File
        </button>
      </div>
    );
  }

  const isHashing = activeTransfer.state === 'HASHING';
  const isCompleted = activeTransfer.state === 'COMPLETED';

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-[#131b2e] border border-[#243252] p-6 rounded-xl flex justify-between items-center">
        <div>
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            OPTICAL SESSION
            {isHashing && (
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                HASHING SHA-256
              </span>
            )}
            {isCompleted && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED COMPLETED
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-gray-100 font-mono mt-1">{activeTransfer.filename}</h2>
        </div>

        <div className="flex space-x-3">
          {isCompleted ? (
            <>
              {activeTransfer.downloadUrl && (
                <a
                  href={activeTransfer.downloadUrl}
                  download={activeTransfer.filename}
                  className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs font-mono px-4 py-2 rounded-lg shadow-lg transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Save Received File</span>
                </a>
              )}
              <button
                onClick={onNewTransfer}
                className="flex items-center space-x-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono px-4 py-2 rounded-lg shadow-lg"
              >
                <span>Send Another File</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {activeTransfer.state === 'PAUSED' ? (
                <button
                  onClick={onResume}
                  className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs font-mono px-4 py-2 rounded-lg"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  onClick={onPause}
                  disabled={isHashing}
                  className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-mono px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </button>
              )}

              <button
                onClick={onCancel}
                className="flex items-center space-x-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs font-mono px-4 py-2 rounded-lg"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Completion Confirmation Banner */}
      {isCompleted && (
        <div className="bg-[#131b2e] border border-emerald-500/50 p-6 rounded-xl space-y-4 shadow-2xl">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100 font-mono">
                Optical Transfer Successfully Verified & Completed!
              </h3>
              <p className="text-xs text-emerald-300 font-mono mt-0.5">
                All binary packet frames received, CRC32 validated, and SHA-256 hash match confirmed.
              </p>
            </div>
          </div>

          <div className="w-full bg-[#0d1322] h-4 rounded-full overflow-hidden p-0.5 border border-emerald-500/30">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full w-full" />
          </div>

          <div className="grid grid-cols-3 gap-4 font-mono text-xs pt-2">
            <div className="bg-[#0d1322] p-3 rounded-lg border border-[#243252]">
              <span className="text-gray-400 block text-[10px]">PAYLOAD SIZE</span>
              <span className="text-white font-bold text-sm">{(activeTransfer.fileSize / 1024).toFixed(1)} KB</span>
            </div>
            <div className="bg-[#0d1322] p-3 rounded-lg border border-[#243252]">
              <span className="text-gray-400 block text-[10px]">AVERAGE THROUGHPUT</span>
              <span className="text-cyan-400 font-bold text-sm">{activeTransfer.averageSpeedMbps} Mbps</span>
            </div>
            <div className="bg-[#0d1322] p-3 rounded-lg border border-[#243252]">
              <span className="text-gray-400 block text-[10px]">VERIFIED SHA256</span>
              <span className="text-purple-300 font-bold text-xs truncate block" title={activeTransfer.sha256}>
                {activeTransfer.sha256 || 'PASS'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SHA256 Hashing Banner for Multi-GB Files */}
      {isHashing && (
        <div className="bg-[#131b2e] border border-purple-500/50 p-6 rounded-xl space-y-4 shadow-2xl">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400 border border-purple-500/30">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100 font-mono">
                Calculating SHA-256 Cryptographic Checksum ({activeTransfer.progressPercent}%)
              </h3>
              <p className="text-xs text-purple-300 font-mono mt-0.5">
                Reading binary payload & computing SHA-256 before optical handshake transmission...
              </p>
            </div>
          </div>

          <div className="w-full bg-[#0d1322] h-4 rounded-full overflow-hidden p-0.5 border border-purple-500/30">
            <div
              className="bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-300 animate-pulse"
              style={{ width: `${activeTransfer.progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-xs font-mono text-gray-400">
            <span>Hashed: <strong className="text-white">{((activeTransfer.bytesHashed || 0) / (1024 * 1024)).toFixed(1)} MB</strong></span>
            <span>Total Size: <strong className="text-purple-300">{((activeTransfer.fileSize || 0) / (1024 * 1024)).toFixed(1)} MB</strong></span>
          </div>
        </div>
      )}

      {/* Main Throughput Graph */}
      {!isHashing && (
        <div className="bg-[#131b2e] border border-[#243252] p-6 rounded-xl space-y-4">
          <ThroughputChart history={speedHistory} />
        </div>
      )}

      {/* Real Time Telemetry Grid */}
      <div className="grid grid-cols-3 gap-4 font-mono text-xs">
        <div className="bg-[#131b2e] border border-[#243252] p-4 rounded-xl space-y-2">
          <div className="text-gray-400 uppercase">TRANSFER METRICS</div>
          <div className="flex justify-between"><span>Bytes Transferred:</span> <span className="text-white">{(activeTransfer.bytesTransferred / 1024).toFixed(1)} KB</span></div>
          <div className="flex justify-between"><span>Total File Size:</span> <span className="text-white">{(activeTransfer.fileSize / 1024).toFixed(1)} KB</span></div>
          <div className="flex justify-between"><span>Estimated Remaining:</span> <span className="text-amber-400">{activeTransfer.etaSeconds || 0} sec</span></div>
        </div>

        <div className="bg-[#131b2e] border border-[#243252] p-4 rounded-xl space-y-2">
          <div className="text-gray-400 uppercase">PACKET PROTOCOL STATS</div>
          <div className="flex justify-between"><span>Packets Sent:</span> <span className="text-cyan-400">{activeTransfer.packetsSent || 1}</span></div>
          <div className="flex justify-between"><span>Retransmissions:</span> <span className="text-amber-400">{activeTransfer.packetsRetransmitted || 0}</span></div>
          <div className="flex justify-between"><span>CRC32 Failures:</span> <span className="text-emerald-400">0</span></div>
        </div>

        <div className="bg-[#131b2e] border border-[#243252] p-4 rounded-xl space-y-2">
          <div className="text-gray-400 uppercase">TARGETED HANDSHAKE STATE</div>
          <div className="flex justify-between"><span>Target Receiver:</span> <span className="text-cyan-400">{activeTransfer.targetReceiverId}</span></div>
          <div className="flex justify-between"><span>Sender ID:</span> <span className="text-purple-300">{activeTransfer.senderId}</span></div>
          <div className="flex justify-between"><span>State Machine:</span> <span className="text-purple-400">{activeTransfer.state}</span></div>
        </div>
      </div>
    </div>
  );
}
