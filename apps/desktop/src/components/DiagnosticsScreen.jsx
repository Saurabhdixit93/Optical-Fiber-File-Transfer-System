import React, { useState } from 'react';
import { Zap, Play, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DiagnosticsScreen() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  const runDiagnostics = async () => {
    setRunning(true);
    setResults(null);
    await new Promise(r => setTimeout(r, 1200));
    setResults({
      linkState: 'ACTIVE',
      transceiverSpeed: '1.00 Gbps',
      latency: '2.1 ms',
      crc32Match: '100% PASS',
      throughput: '894 Mbps',
      resumableJournal: 'OK'
    });
    setRunning(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto font-mono text-xs">
      <div className="bg-[#131b2e] border border-[#243252] p-4 sm:p-6 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />
              Optical Link Diagnostics Suite
            </h2>
            <p className="text-gray-400 mt-1 text-[11px] sm:text-xs">Execute automated connection, throughput, and CRC packet integrity tests</p>
          </div>
          <button
            onClick={runDiagnostics}
            disabled={running}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-bold px-5 py-2.5 rounded-lg shadow-md disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{running ? 'Testing...' : 'Run Diagnostics'}</span>
          </button>
        </div>
      </div>

      {results && (
        <div className="bg-[#131b2e] border border-[#243252] p-4 sm:p-6 rounded-xl space-y-4">
          <h3 className="font-bold text-sm text-gray-200">Diagnostic Results</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-[#0d1322] p-3 sm:p-4 rounded-lg border border-[#243252] flex justify-between items-center">
              <span>Link State:</span> <span className="text-emerald-400 font-bold">{results.linkState}</span>
            </div>
            <div className="bg-[#0d1322] p-3 sm:p-4 rounded-lg border border-[#243252] flex justify-between items-center">
              <span>Negotiated Speed:</span> <span className="text-cyan-400 font-bold">{results.transceiverSpeed}</span>
            </div>
            <div className="bg-[#0d1322] p-3 sm:p-4 rounded-lg border border-[#243252] flex justify-between items-center">
              <span>Loopback Latency:</span> <span className="text-white font-bold">{results.latency}</span>
            </div>
            <div className="bg-[#0d1322] p-3 sm:p-4 rounded-lg border border-[#243252] flex justify-between items-center">
              <span>CRC32 Checksum Test:</span> <span className="text-emerald-400 font-bold">{results.crc32Match}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
