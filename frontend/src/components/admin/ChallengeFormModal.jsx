import React, { useState, useEffect } from 'react';

const ChallengeFormModal = ({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  initialData = null,
  isLoading = false,
  error = null,
  onSubmit,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hiddenCode, setHiddenCode] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [constraints, setConstraints] = useState('');
  const [score, setScore] = useState(100);
  const [hackerRankUrl, setHackerRankUrl] = useState('');
  const [status, setStatus] = useState('ENABLED');
  const [clientError, setClientError] = useState(null);

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setHiddenCode(initialData.hiddenCode || '');
      setInputFormat(initialData.inputFormat || '');
      setOutputFormat(initialData.outputFormat || '');
      setConstraints(initialData.constraints || '');
      setScore(initialData.score !== undefined ? initialData.score : 100);
      setHackerRankUrl(initialData.hackerRankUrl || '');
      setStatus(initialData.status || 'ENABLED');
    } else {
      setTitle('');
      setDescription('');
      setHiddenCode(
        `// JavaScript hidden logic template\nfunction solution(input) {\n  // Process input string and return expected output\n  return input;\n}`
      );
      setInputFormat('Standard input as string');
      setOutputFormat('Expected result as string');
      setConstraints('1 <= input.length <= 1000');
      setScore(100);
      setHackerRankUrl('');
      setStatus('ENABLED');
    }
    setClientError(null);
  }, [initialData, mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setClientError(null);

    if (!title.trim()) {
      setClientError('Challenge title is required.');
      return;
    }

    if (!description.trim()) {
      setClientError('Challenge description is required.');
      return;
    }

    if (!hiddenCode.trim()) {
      setClientError('Hidden JavaScript code logic is required.');
      return;
    }

    const numericScore = Number(score);
    if (isNaN(numericScore) || numericScore <= 0) {
      setClientError('Score must be a positive number.');
      return;
    }

    if (hackerRankUrl.trim() && !/^https?:\/\//i.test(hackerRankUrl.trim())) {
      setClientError('HackerRank URL must begin with http:// or https://');
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      hiddenCode,
      inputFormat: inputFormat.trim(),
      outputFormat: outputFormat.trim(),
      constraints: constraints.trim(),
      score: numericScore,
      hackerRankUrl: hackerRankUrl.trim(),
      status,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span className="text-indigo-400 font-mono">&gt;</span>
            {mode === 'edit' ? 'Edit Challenge Details' : 'Create New Challenge'}
          </h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-white transition text-lg"
          >
            ✕
          </button>
        </div>

        {(error || clientError) && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-sm rounded-lg flex items-center gap-2">
            <span className="text-red-400">⚠️</span>
            <span>{error || clientError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm font-sans">
          {/* Title & Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-slate-300 mb-1 font-semibold">
                Challenge Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Inverted Matrix Sum"
                disabled={isLoading}
                required
                maxLength={150}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Score (Points) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                disabled={isLoading}
                required
                min={1}
                max={10000}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the challenge overview..."
              disabled={isLoading}
              required
              rows={2}
              maxLength={2000}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none text-xs"
            />
          </div>

          {/* Hidden JavaScript Logic */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-slate-300 font-semibold flex items-center gap-1.5">
                <span className="text-amber-400 font-mono">🔒</span>
                <span>Hidden JavaScript Logic</span>
                <span className="text-red-400">*</span>
              </label>
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                Admin-Only Secret
              </span>
            </div>
            <textarea
              value={hiddenCode}
              onChange={(e) => setHiddenCode(e.target.value)}
              placeholder="// Write hidden JavaScript algorithm logic here..."
              disabled={isLoading}
              required
              rows={6}
              className="w-full bg-slate-950 border border-amber-900/60 focus:border-amber-500 rounded-lg p-3 text-emerald-400 placeholder-slate-600 focus:outline-none transition font-mono text-xs leading-relaxed resize-y"
              spellCheck="false"
            />
            <p className="text-[11px] text-slate-400">
              This code will execute in a secure sandbox. It is strictly hidden from participant API responses.
            </p>
          </div>

          {/* Input & Output Format */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Input Format
              </label>
              <input
                type="text"
                value={inputFormat}
                onChange={(e) => setInputFormat(e.target.value)}
                placeholder="e.g. Single line integer N"
                disabled={isLoading}
                maxLength={1000}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Output Format
              </label>
              <input
                type="text"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                placeholder="e.g. Transformed result string"
                disabled={isLoading}
                maxLength={1000}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono text-xs"
              />
            </div>
          </div>

          {/* Constraints & HackerRank URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Constraints
              </label>
              <input
                type="text"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder="e.g. 1 <= N <= 10^5"
                disabled={isLoading}
                maxLength={1000}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                HackerRank URL
              </label>
              <input
                type="url"
                value={hackerRankUrl}
                onChange={(e) => setHackerRankUrl(e.target.value)}
                placeholder="https://www.hackerrank.com/..."
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono text-xs"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isLoading}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 transition font-mono text-xs"
            >
              <option value="ENABLED">ENABLED (Active challenge in event)</option>
              <option value="DISABLED">DISABLED (Hidden from participants)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              )}
              {mode === 'edit' ? 'Save Changes' : 'Create Challenge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChallengeFormModal;
