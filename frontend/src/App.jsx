import React, { useState, useEffect } from 'react';

// Tech Vortex Modular React Frontend
export default function App() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [xp, setXp] = useState(1240);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 font-sans">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-white text-lg">
            ⚡
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">TECH <span className="text-cyan-400">VORTEX</span></h1>
            <p className="text-xs text-slate-400">AI Driven Career Intelligence Platform</p>
          </div>
        </div>
        <div className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">
          ⚡ {xp} Vortex XP
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="p-6 rounded-2xl bg-[#0D1424] border border-slate-800">
          <h2 className="text-2xl font-bold text-white mb-2">Platform Master Console</h2>
          <p className="text-sm text-slate-300">
            For the complete offline-ready production build with audio synthesizers, 4-7-8 breathing calm cycles,
            live speech recognition mock interviews, and 5-stage AI ML pipelines, open the root <code>index.html</code>.
          </p>
        </div>
      </main>
    </div>
  );
}
