import React from 'react';

export default function ThroughputChart({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-xs font-mono text-gray-500 border border-dashed border-[#243252] rounded-lg">
        Awaiting transfer activity...
      </div>
    );
  }

  const maxVal = Math.max(...history, 100);
  const width = 600;
  const height = 120;
  const points = history.map((val, idx) => {
    const x = (idx / (history.length - 1 || 1)) * width;
    const y = height - (val / maxVal) * (height - 15) - 5;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full bg-[#0d1322] p-3 rounded-lg border border-[#243252]">
      <div className="flex justify-between items-center text-xs font-mono text-gray-400 mb-2">
        <span>THROUGHPUT GRAPH (Mbps)</span>
        <span className="text-cyan-400 font-bold">{history[history.length - 1] || 0} Mbps</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1="0" y1="30" x2={width} y2="30" stroke="#1a243b" strokeDasharray="3 3" />
        <line x1="0" y1="60" x2={width} y2="60" stroke="#1a243b" strokeDasharray="3 3" />
        <line x1="0" y1="90" x2={width} y2="90" stroke="#1a243b" strokeDasharray="3 3" />

        {/* Filled Area */}
        {points && (
          <polygon
            points={`0,${height} ${points} ${width},${height}`}
            fill="url(#chartGrad)"
          />
        )}

        {/* Polyline */}
        <polyline
          fill="none"
          stroke="#00f2fe"
          strokeWidth="2"
          points={points}
        />
      </svg>
    </div>
  );
}
