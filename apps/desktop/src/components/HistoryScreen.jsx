import React, { useState } from 'react';
import { History, Search, CheckCircle2 } from 'lucide-react';

export default function HistoryScreen({ transfers = [] }) {
  const [query, setQuery] = useState('');

  const filtered = transfers.filter(t => t.filename.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-mono text-xs">
      <div className="bg-[#131b2e] border border-[#243252] p-6 rounded-xl space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            Complete Optical Transfer Logs
          </h2>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search history..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-[#0d1322] border border-[#243252] rounded-lg pl-9 pr-4 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0d1322] text-gray-400 uppercase text-[10px] border-b border-[#243252]">
              <tr>
                <th className="p-3">File Name</th>
                <th className="p-3">Direction</th>
                <th className="p-3">Size</th>
                <th className="p-3">Avg Speed</th>
                <th className="p-3">Status</th>
                <th className="p-3">Integrity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243252]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 font-mono text-xs">
                    No optical transfer history records matching filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#1a243b]">
                    <td className="p-3 font-semibold text-gray-200">{item.filename}</td>
                    <td className="p-3 text-cyan-400">{item.direction || 'SEND'}</td>
                    <td className="p-3">{item.size}</td>
                    <td className="p-3 text-blue-400">{item.speed}</td>
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
