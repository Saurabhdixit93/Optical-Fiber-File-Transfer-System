import React, { useState } from 'react';
import {
  Activity,
  Send,
  Download,
  Settings,
  History,
  Zap,
  Radio,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Globe
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  linkStatus,
  mode,
  setMode,
  myDeviceId,
  collapsed,
  setCollapsed,
  activeTransfer,
  isMobileOpen,
  onCloseMobile
}) {
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'send', label: 'Send Files', icon: Send },
    { id: 'active', label: 'Active Transfer', icon: Radio, badge: activeTransfer ? '1' : null },
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
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      <aside
        className={`h-screen fixed md:sticky top-0 left-0 z-50 flex-shrink-0 bg-[#131b2e] border-r border-[#243252] flex flex-col justify-between transition-all duration-300 shadow-2xl ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        {/* Top Header & Collapse Toggle */}
        <div>
          <div className="h-16 border-b border-[#243252] px-3 flex items-center justify-between">
            {!collapsed ? (
              <>
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex-shrink-0">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="whitespace-nowrap overflow-hidden">
                    <h1 className="text-sm font-bold tracking-wider text-gray-100 flex items-center gap-1.5 font-mono">
                      OPTICAL
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.2 rounded">
                        v1.0
                      </span>
                    </h1>
                    <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Fiber Protocol</p>
                  </div>
                </div>

                <button
                  onClick={() => setCollapsed(true)}
                  className="hidden md:flex p-1.5 rounded-lg bg-[#0d1322] border border-[#243252] text-gray-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all flex-shrink-0"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="w-full flex items-center justify-center relative">
                <button
                  onClick={() => setCollapsed(false)}
                  className="hidden md:flex p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all items-center justify-center shadow-lg"
                  title="Expand Sidebar"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  title={collapsed ? tab.label : ''}
                  className={`w-full flex items-center ${
                    collapsed ? 'md:justify-center md:px-0 px-3.5' : 'justify-between px-3.5'
                  } py-3 rounded-xl font-mono text-xs transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border-l-4 border-cyan-400 font-bold shadow-md'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a243b]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'group-hover:text-gray-200'}`} />
                    <span className={`${collapsed ? 'md:hidden' : 'inline'} truncate`}>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span className="bg-cyan-500 text-black font-bold text-[10px] px-2 py-0.5 rounded-full font-mono animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

      {/* Bottom Telemetry & Status Panel */}
      <div className="p-3 border-t border-[#243252] space-y-3 bg-[#0d1322]/50 font-mono text-xs">
        {/* Device ID Badge */}
        {!collapsed ? (
          <div className="bg-[#0d1322] p-2.5 rounded-xl border border-[#243252] space-y-1">
            <div className="text-[10px] text-gray-400 uppercase flex justify-between items-center">
              <span>Your Device ID</span>
              <button
                onClick={handleCopyId}
                className="text-cyan-400 hover:text-cyan-300"
                title="Copy Device ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-xs font-bold text-purple-300 truncate" title={myDeviceId}>
              {myDeviceId}
            </div>
          </div>
        ) : (
          <button
            onClick={handleCopyId}
            title={`Copy Device ID: ${myDeviceId}`}
            className="w-full p-2 bg-[#0d1322] rounded-xl border border-[#243252] text-purple-300 hover:text-white flex justify-center"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        )}

        {/* Optical Link Status Badge */}
        {!collapsed ? (
          <div className="bg-[#0d1322] p-2.5 rounded-xl border border-[#243252] flex items-center justify-between">
            <span className="text-gray-400 text-[11px]">Link Status</span>
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${linkStatus === 'ACTIVE' ? 'bg-emerald-400 animate-ping' : 'bg-amber-500'}`} />
              <span className="text-emerald-400 font-bold text-[11px]">Active</span>
            </div>
          </div>
        ) : (
          <div className="p-2 bg-[#0d1322] rounded-xl border border-[#243252] flex justify-center" title="Optical Link Active">
            <span className={`w-2.5 h-2.5 rounded-full ${linkStatus === 'ACTIVE' ? 'bg-emerald-400 animate-ping' : 'bg-amber-500'}`} />
          </div>
        )}

        {/* Mode Toggle Button */}
        {!collapsed ? (
          <button
            onClick={() => {
              const modes = ['Simulation', 'WebSocket', 'Hardware'];
              const idx = modes.indexOf(mode);
              setMode(modes[(idx + 1) % modes.length]);
            }}
            className={`w-full py-2 px-3 rounded-xl border font-bold text-center transition-all flex items-center justify-center gap-2 ${
              mode === 'Simulation'
                ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20'
                : mode === 'WebSocket'
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {mode === 'WebSocket' && <Globe className="w-3.5 h-3.5" />}
            {mode} Mode
          </button>
        ) : (
          <button
            onClick={() => {
              const modes = ['Simulation', 'WebSocket', 'Hardware'];
              const idx = modes.indexOf(mode);
              setMode(modes[(idx + 1) % modes.length]);
            }}
            className={`w-full py-2 bg-[#0d1322] rounded-xl border border-[#243252] text-center font-bold text-[10px] ${
              mode === 'WebSocket' ? 'text-cyan-300' : 'text-gray-300'
            }`}
            title={`Mode: ${mode}`}
          >
            {mode === 'WebSocket' ? <Globe className="w-4 h-4 mx-auto" /> : mode[0]}
          </button>
        )}
      </div>
    </aside>
    </>
  );
}
