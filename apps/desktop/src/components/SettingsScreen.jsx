import React, { useState } from 'react';
import { Settings, Save } from 'lucide-react';

export default function SettingsScreen({ settings, setSettings }) {
  const [localState, setLocalState] = useState(settings);

  const handleSave = () => {
    setSettings(localState);
    alert('Settings updated successfully!');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-mono text-xs">
      <div className="bg-[#131b2e] border border-[#243252] p-6 rounded-xl space-y-6">
        <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          Protocol & Transport Configuration
        </h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-400 mb-1">File Chunk Size:</label>
            <select
              value={localState.chunkSize}
              onChange={(e) => setLocalState({ ...localState, chunkSize: Number(e.target.value) })}
              className="w-full bg-[#0d1322] border border-[#243252] rounded-lg p-2.5 text-gray-200"
            >
              <option value={4096}>4 KB</option>
              <option value={16384}>16 KB</option>
              <option value={32768}>32 KB</option>
              <option value={65536}>64 KB (Default)</option>
              <option value={131072}>128 KB</option>
              <option value={262144}>256 KB</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Sliding Window Size:</label>
            <select
              value={localState.windowSize}
              onChange={(e) => setLocalState({ ...localState, windowSize: Number(e.target.value) })}
              className="w-full bg-[#0d1322] border border-[#243252] rounded-lg p-2.5 text-gray-200"
            >
              <option value={16}>16 Packets</option>
              <option value={32}>32 Packets</option>
              <option value={64}>64 Packets (Default)</option>
              <option value={128}>128 Packets</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Simulated Packet Loss Rate:</label>
            <select
              value={localState.lossRate}
              onChange={(e) => setLocalState({ ...localState, lossRate: Number(e.target.value) })}
              className="w-full bg-[#0d1322] border border-[#243252] rounded-lg p-2.5 text-gray-200"
            >
              <option value={0}>0% (Ideal Link)</option>
              <option value={0.001}>0.1% (Low Loss)</option>
              <option value={0.01}>1% (Medium Loss)</option>
              <option value={0.05}>5% (High Loss Chaos)</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Retry Limit:</label>
            <input
              type="number"
              value={localState.retryLimit}
              onChange={(e) => setLocalState({ ...localState, retryLimit: Number(e.target.value) })}
              className="w-full bg-[#0d1322] border border-[#243252] rounded-lg p-2 text-gray-200"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 py-2.5 rounded-lg shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
}
