import React, { useState, useRef } from 'react';

const ImportParticipantsModal = ({ isOpen, onClose, onImport, isLoading }) => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    setError(null);
    setStep(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/json' && !selectedFile.name.endsWith('.json')) {
      setError('Please select a valid JSON file.');
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleValidate = () => {
    if (!file) {
      setError('No file selected.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (!Array.isArray(json)) {
          setError('The JSON file must contain a top-level array of participants.');
          return;
        }

        if (json.length === 0) {
          setError('The JSON array is empty.');
          return;
        }

        // Basic structural validation
        const isValid = json.every(p => p.name && p.email && p.password);
        if (!isValid) {
          setError('Some participants are missing required fields (name, email, password). Please check the file format.');
          return;
        }

        setPreviewData(json);
        setStep(2);
        setError(null);
      } catch (err) {
        setError('Failed to parse JSON. Please ensure the file contains valid JSON.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read the file.');
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    onImport(previewData, handleClose);
  };

  const handleDownloadSample = () => {
    const sample = [
      {
        name: "AARAMBHIKA",
        email: "20251651001@iiitvadodara.ac.in",
        password: "Contest#2026@BT"
      }
    ];
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'participants-sample.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#030914] border border-slate-700/60 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
          <h2 className="text-lg font-bold text-white font-mono">Import Participants</h2>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition"
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-6 p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-300 text-sm flex items-start gap-2">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-300 font-mono">
                  Select JSON File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-cyan-950/40 file:text-cyan-400 hover:file:bg-cyan-900/40 transition file:cursor-pointer border border-slate-800 rounded-xl bg-[#071324]/50 focus:outline-none"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Upload a .json file containing an array of participant objects.
                </p>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-slate-300">File Format</h3>
                  <button 
                    onClick={handleDownloadSample}
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                    type="button"
                  >
                    Download Sample
                  </button>
                </div>
                <pre className="text-xs text-slate-400 font-mono bg-black/40 p-3 rounded-lg overflow-x-auto">
{`[
  {
    "name": "AARAMBHIKA",
    "email": "20251651001@iiitvadodara.ac.in",
    "password": "Contest#2026@BT"
  }
]`}
                </pre>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-emerald-950/30 border border-emerald-800/40 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-emerald-400 font-bold font-mono">Validation Successful</h3>
                  <p className="text-emerald-300/70 text-xs mt-1">Found {previewData.length} valid participant records.</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-900/50 flex items-center justify-center text-xl">
                  ✓
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-900/60 px-4 py-2 border-b border-slate-800 text-xs font-semibold text-slate-400">
                  Preview (First 10 records)
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/40 text-slate-500 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 font-medium">Name</th>
                        <th className="px-4 py-2 font-medium">Email</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {previewData.slice(0, 10).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="px-4 py-2.5 text-slate-300">{p.name}</td>
                          <td className="px-4 py-2.5 text-slate-400 font-mono">{p.email}</td>
                          <td className="px-4 py-2.5">
                            <span className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded text-[10px] uppercase">Ready</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 10 && (
                    <div className="p-3 text-center text-xs text-slate-500 bg-slate-950/30">
                      ... and {previewData.length - 10} more records
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-900/40 flex justify-end gap-3">
          <button
            type="button"
            onClick={step === 2 && !isLoading ? () => setStep(1) : handleClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            {step === 2 ? 'Back' : 'Cancel'}
          </button>
          
          {step === 1 ? (
            <button
              onClick={handleValidate}
              disabled={!file || isLoading}
              className="px-6 py-2 rounded-xl text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Validate File
            </button>
          ) : (
            <button
              onClick={handleConfirmImport}
              disabled={isLoading}
              className="px-6 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Importing...
                </>
              ) : (
                'Confirm Import'
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ImportParticipantsModal;
