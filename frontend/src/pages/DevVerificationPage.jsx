import React from 'react';
import HealthChecker from '../components/HealthChecker';

const DevVerificationPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/80 border border-cyan-700/60 rounded-full text-cyan-400 text-xs font-mono mb-4">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          ARCHITECTURAL BASELINE
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 font-mono">
          BlackBox Coding Event Platform
        </h1>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          Foundation, Architecture, Environment Setup & API Verification Dashboard.
        </p>
      </div>

      <HealthChecker />

      <div className="mt-8 max-w-2xl w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 mb-1">Frontend Stack</div>
          <div className="text-cyan-400 font-semibold">React + Vite + Tailwind</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 mb-1">Backend Stack</div>
          <div className="text-cyan-400 font-semibold">Node + Express.js</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 mb-1">Database Stack</div>
          <div className="text-cyan-400 font-semibold">MongoDB Atlas</div>
        </div>
      </div>
    </div>
  );
};

export default DevVerificationPage;
