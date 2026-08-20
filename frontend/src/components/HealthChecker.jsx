import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

const HealthChecker = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testing404, setTesting404] = useState(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/health');
      setHealth(response);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend server');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  const testUnknownRoute = async () => {
    setTesting404(null);
    try {
      await apiClient.get('/does-not-exist');
    } catch (err) {
      setTesting404(err);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl max-w-2xl w-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <h2 className="text-lg font-bold text-slate-100 tracking-wide font-mono">
            API Health & Communication Test
          </h2>
        </div>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Refresh Status'}
        </button>
      </div>

      {loading && (
        <div className="p-8 text-center text-slate-400 font-mono text-sm animate-pulse">
          Sending HTTP GET /api/health to Express server...
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-lg text-rose-300 font-mono text-sm">
          <div className="font-bold mb-1">❌ Connection Failed</div>
          <div>{error}</div>
          <div className="text-xs text-rose-400 mt-2">
            Ensure backend server is running on port 5000 (`npm run dev:backend`).
          </div>
        </div>
      )}

      {health && !loading && (
        <div className="space-y-4 font-mono text-sm">
          <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-emerald-300 flex items-center justify-between">
            <span className="font-bold">STATUS: {health.data?.status || 'HEALTHY'}</span>
            <span className="text-xs bg-emerald-900/60 text-emerald-200 px-2 py-1 rounded">
              200 OK
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs overflow-x-auto text-emerald-400">
            <pre>{JSON.stringify(health, null, 2)}</pre>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-400 font-mono">
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500">Uptime:</span> {health.data?.uptime}
            </div>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500">DB Status:</span>{' '}
              <span className={health.data?.database === 'connected' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {health.data?.database}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 404 Verification Test */}
      <div className="mt-6 pt-5 border-t border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono text-slate-400">404 Error Middleware Test:</span>
          <button
            onClick={testUnknownRoute}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded border border-slate-700 transition cursor-pointer"
          >
            Test GET /api/does-not-exist
          </button>
        </div>

        {testing404 && (
          <div className="bg-slate-950 border border-slate-800 rounded p-3 text-xs font-mono text-amber-400">
            <div className="text-slate-400 mb-1">Controlled 404 JSON Response Received:</div>
            <pre>{JSON.stringify(testing404, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthChecker;
