import React from 'react';
import { Activity, Send, Download, Settings, History, Zap, Radio, ShieldCheck } from 'lucide-react';

const titleMap = {
  dashboard: { title: 'Dashboard', icon: Activity, subtitle: 'Optical link real-time throughput & telemetry' },
  send: { title: 'Send Files', icon: Send, subtitle: 'Targeted optical device transfer queue' },
  active: { title: 'Active Transfer', icon: Radio, subtitle: 'Live packet stream & sliding window metrics' },
  receiver: { title: 'Receiver Node', icon: Download, subtitle: 'Target receiver configuration & received files' },
  diagnostics: { title: 'Diagnostics', icon: Zap, subtitle: 'Automated optical link & packet integrity suite' },
  history: { title: 'Transfer History', icon: History, subtitle: 'Searchable log of verified file transfers' },
  settings: { title: 'Settings', icon: Settings, subtitle: 'Protocol chunking, window size & link configuration' },
};

export default function Header({ activeTab, myDeviceId, targetReceiverId }) {
  const current = titleMap[activeTab] || titleMap.dashboard;
  const Icon = current.icon;

  return (
    <header className="bg-[#131b2e] border-b border-[#243252] px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-100 font-mono flex items-center gap-2">
            {current.title}
          </h1>
          <p className="text-xs text-gray-400 font-mono">{current.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center space-x-4 font-mono text-xs">
        <div className="bg-[#0d1322] px-3 py-1.5 rounded-xl border border-[#243252] flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-gray-400">Target Receiver:</span>
          <span className="text-cyan-400 font-bold">{targetReceiverId}</span>
        </div>
      </div>
    </header>
  );
}
