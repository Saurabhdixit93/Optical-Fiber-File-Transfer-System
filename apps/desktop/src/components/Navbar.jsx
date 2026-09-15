import React, { useState } from 'react';
import {
  Activity,
  Send,
  Download,
  Settings,
  History,
  ShieldCheck,
  Zap,
  Radio,
  Copy,
  Check
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, linkStatus, mode, setMode, myDeviceId }) {
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'send', label: 'Send Files', icon: Send },
    { id: 'receiver', label: 'Receiver', icon: Download },
    { id: 'diagnostics', label: 'Diagnostics', icon: Zap },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleCopyId = () => {
    navigator.clipboard.writeText(myDeviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="border-b border-[#243252] bg-[#131b2e] px-6 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          <Radio className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-wide text-gray-100 flex items-center gap-2">
            OPTICAL FIBER TRANSFER
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              v1.0 PROD
            </span>
          </h1>
          <p className="text-xs text-gray-400 font-mono">TARGETED DEVICE HANDSHAKE PROTOCOL</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center space-x-1 bg-[#0d1322] p-1 rounded-xl border border-[#243252]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a243b]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Device ID Badge & Link Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-[#0d1322] px-3 py-1.5 rounded-lg border border-purple-500/30 text-xs font-mono">
          <span className="text-gray-400">YOUR DEVICE ID:</span>
          <span className="text-purple-300 font-bold">{myDeviceId}</span>
          <button
            onClick={handleCopyId}
            title="Copy Device ID"
            className="text-gray-400 hover:text-white p-0.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center space-x-2 bg-[#0d1322] px-3 py-1.5 rounded-lg border border-[#243252] text-xs font-mono">
          <span className={`w-2.5 h-2.5 rounded-full ${linkStatus === 'ACTIVE' ? 'bg-emerald-400 animate-ping' : 'bg-amber-500'}`} />
          <span className="text-gray-200 font-semibold">
            {linkStatus === 'ACTIVE' ? '● Optical Link Active' : 'Connecting...'}
          </span>
        </div>
      </div>
    </header>
  );
}
