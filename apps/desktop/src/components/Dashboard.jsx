import React from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Cpu,
  HardDrive,
  CheckCircle2,
  History,
} from "lucide-react";
import ThroughputChart from "./ThroughputChart";

export default function Dashboard({
  activeTransfer,
  recentTransfers,
  speedHistory,
  onStartDemoSend,
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Telemetry Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#131b2e] border border-[#243252] p-3 sm:p-4 rounded-xl shadow-sm">
          <div className="text-[10px] sm:text-xs font-mono text-gray-400">LINK SPEED</div>
          <div className="text-lg sm:text-2xl font-bold text-cyan-400 font-mono mt-1">
            1.00 Gbps
          </div>
          <div className="text-[10px] sm:text-[11px] text-gray-500 font-mono mt-1 truncate">
            Optical Standard
          </div>
        </div>

        <div className="bg-[#131b2e] border border-[#243252] p-3 sm:p-4 rounded-xl shadow-sm">
          <div className="text-[10px] sm:text-xs font-mono text-gray-400">TRANSFER SPEED</div>
          <div className="text-lg sm:text-2xl font-bold text-blue-400 font-mono mt-1">
            {activeTransfer
              ? `${activeTransfer.currentSpeedMbps} Mbps`
              : "0 Mbps"}
          </div>
          <div className="text-[10px] sm:text-[11px] text-gray-500 font-mono mt-1">
            {activeTransfer
              ? `${(activeTransfer.currentSpeedMbps / 8).toFixed(2)} MB/s`
              : "Idle"}
          </div>
        </div>

        <div className="bg-[#131b2e] border border-[#243252] p-3 sm:p-4 rounded-xl shadow-sm">
          <div className="text-[10px] sm:text-xs font-mono text-gray-400">OPTICAL SIGNAL</div>
          <div className="text-lg sm:text-2xl font-bold text-emerald-400 font-mono mt-1">
            Good (0.0 dBm)
          </div>
          <div className="text-[10px] sm:text-[11px] text-gray-500 font-mono mt-1">
            Zero attenuation
          </div>
        </div>

        <div className="bg-[#131b2e] border border-[#243252] p-3 sm:p-4 rounded-xl shadow-sm">
          <div className="text-[10px] sm:text-xs font-mono text-gray-400">
            PACKET INTEGRITY
          </div>
          <div className="text-lg sm:text-2xl font-bold text-purple-400 font-mono mt-1">
            CRC32 / SHA256
          </div>
          <div className="text-[10px] sm:text-[11px] text-gray-500 font-mono mt-1">
            100% Verified
          </div>
        </div>
      </div>

      {/* Current Transfer Section */}
      <div className="bg-[#131b2e] border border-[#243252] p-4 sm:p-6 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-sm sm:text-base font-bold text-gray-100 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-cyan-400" />
            Current Transfer Status
          </h2>
          {!activeTransfer && (
            <button
              onClick={onStartDemoSend}
              className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs px-4 py-2 rounded-lg font-mono transition-all shadow-md"
            >
              + Start Simulated Transfer (100 MB)
            </button>
          )}
        </div>

        {activeTransfer ? (
          <div className="space-y-4 bg-[#0d1322] p-3 sm:p-4 rounded-lg border border-[#243252]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs sm:text-sm font-mono gap-1">
              <span className="font-bold text-cyan-300 truncate max-w-full">
                {activeTransfer.filename || "dataset.bin"}
              </span>
              <span className="text-gray-400 text-xs">
                {(activeTransfer.bytesTransferred / (1024 * 1024)).toFixed(1)}{" "}
                MB / {(activeTransfer.fileSize / (1024 * 1024)).toFixed(1)} MB
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#1a243b] h-3 rounded-full overflow-hidden p-0.5 border border-[#243252]">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${activeTransfer.progressPercent}%` }}
              />
            </div>

            <div className="flex flex-wrap justify-between text-xs font-mono text-gray-400 gap-2">
              <span>
                Progress:{" "}
                <strong className="text-white">
                  {activeTransfer.progressPercent}%
                </strong>
              </span>
              <span>
                Speed:{" "}
                <strong className="text-cyan-400">
                  {activeTransfer.currentSpeedMbps} Mbps
                </strong>
              </span>
              <span>
                ETA:{" "}
                <strong className="text-amber-400">
                  {activeTransfer.etaSeconds}s remaining
                </strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-xs font-mono border border-dashed border-[#243252] rounded-lg">
            No active transfer currently running. Select "Send Files" or click
            above to initiate.
          </div>
        )}

        <ThroughputChart history={speedHistory} />
      </div>

      {/* Recent Transfers Table */}
      <div className="bg-[#131b2e] border border-[#243252] p-6 rounded-xl space-y-4">
        <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
          <History className="w-5 h-5 text-purple-400" />
          Recent Transfers Log
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono text-gray-300">
            <thead className="bg-[#0d1322] text-gray-400 uppercase text-[10px] border-b border-[#243252]">
              <tr>
                <th className="p-3">File Name</th>
                <th className="p-3">Size</th>
                <th className="p-3">Avg Speed</th>
                <th className="p-3">Status</th>
                <th className="p-3">Integrity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243252]">
              {!recentTransfers || recentTransfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 font-mono text-xs">
                    No recent optical transfer records available.
                  </td>
                </tr>
              ) : (
                recentTransfers.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#1a243b]">
                    <td className="p-3 font-semibold text-gray-200">
                      {item.filename}
                    </td>
                    <td className="p-3">{item.size}</td>
                    <td className="p-3 text-cyan-400">{item.speed}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
