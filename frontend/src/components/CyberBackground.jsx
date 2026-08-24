import React from 'react';

const BINARY_COLUMNS = [
  '010110010110010101010100101011001011001010101010010',
  '100101010110010100101101010101001010110010110010101',
  '110100101010110010110010101010100101011001011001010',
  '001011010101010010101100101100101010101001010110010',
  '011001010101010010101100101100101010101001010110010',
  '101010010101100101100101010101001010110010110010101',
  '110010101010010110010110010101010100101011001011001',
  '010101001010110010110010101010100101011001011001010',
];

// Small squares scattered across the background — positions as percent
const SMALL_SQUARES = [
  { x: '6%',  y: '8%',  size: 48, delay: 0,    dur: 5 },
  { x: '18%', y: '22%', size: 36, delay: 1.2,  dur: 7 },
  { x: '32%', y: '7%',  size: 56, delay: 0.5,  dur: 6 },
  { x: '52%', y: '18%', size: 40, delay: 2.1,  dur: 8 },
  { x: '68%', y: '5%',  size: 52, delay: 0.8,  dur: 5.5 },
  { x: '82%', y: '14%', size: 44, delay: 1.6,  dur: 7.5 },
  { x: '90%', y: '32%', size: 38, delay: 3.0,  dur: 6.5 },
  { x: '78%', y: '48%', size: 60, delay: 0.3,  dur: 9 },
  { x: '88%', y: '65%', size: 42, delay: 1.8,  dur: 6 },
  { x: '72%', y: '80%', size: 50, delay: 2.5,  dur: 7 },
  { x: '55%', y: '88%', size: 34, delay: 0.7,  dur: 5 },
  { x: '38%', y: '78%', size: 58, delay: 1.4,  dur: 8.5 },
  { x: '22%', y: '85%', size: 44, delay: 2.8,  dur: 6 },
  { x: '8%',  y: '70%', size: 40, delay: 0.9,  dur: 7 },
  { x: '14%', y: '52%', size: 52, delay: 1.7,  dur: 5.5 },
  { x: '4%',  y: '38%', size: 36, delay: 3.2,  dur: 9 },
  { x: '45%', y: '52%', size: 46, delay: 2.0,  dur: 6.5 },
  { x: '26%', y: '42%', size: 38, delay: 1.1,  dur: 7.5 },
  { x: '60%', y: '40%', size: 54, delay: 0.4,  dur: 8 },
  { x: '44%', y: '30%', size: 32, delay: 2.6,  dur: 5 },
];

const CyberBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
      {/* Background Base Grid Texture */}
      <div className="absolute inset-0 tech-grid opacity-75"></div>

      {/* Deep Midnight Ambient Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-blue-900/8 rounded-full blur-3xl"></div>

      {/* Running 01 Binary Stream Columns */}
      <div className="absolute inset-0 flex justify-around opacity-[0.05] font-mono text-xs text-cyan-400 overflow-hidden leading-5">
        {BINARY_COLUMNS.map((col, idx) => (
          <div
            key={idx}
            className="animate-binary whitespace-pre-wrap break-all w-8"
            style={{ animationDuration: `${16 + (idx % 4) * 3}s`, animationDelay: `${idx * 1.2}s` }}
          >
            {col}
            {col}
          </div>
        ))}
      </div>

      {/* SVG: Small Animated Glowing Squares Only */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glow filter for the trace lines */}
          <filter id="squareGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Cyan trace gradient */}
          <linearGradient id="traceGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>

          {/* Blue trace gradient */}
          <linearGradient id="traceGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {SMALL_SQUARES.map((sq, idx) => {
          const traceGrad = idx % 2 === 0 ? 'url(#traceGrad1)' : 'url(#traceGrad2)';
          const traceClass = idx % 3 === 0
            ? 'animate-square-trace-1'
            : idx % 3 === 1
              ? 'animate-square-trace-2'
              : 'animate-square-trace-3';
          const baseOpacity = 0.12 + (idx % 4) * 0.04;

          return (
            <g key={idx} filter="url(#squareGlow)">
              {/* Static dim base border */}
              <rect
                x={sq.x}
                y={sq.y}
                width={sq.size}
                height={sq.size}
                fill="none"
                stroke={`rgba(30, 58, 138, ${baseOpacity})`}
                strokeWidth="0.8"
              />
              {/* Animated glowing trace line running along the perimeter */}
              <rect
                x={sq.x}
                y={sq.y}
                width={sq.size}
                height={sq.size}
                fill="none"
                stroke={traceGrad}
                strokeWidth="1.2"
                className={traceClass}
                style={{
                  animationDuration: `${sq.dur}s`,
                  animationDelay: `${sq.delay}s`,
                }}
              />
              {/* Corner dot — top-left */}
              <circle
                cx={sq.x}
                cy={sq.y}
                r="1.5"
                fill="#38bdf8"
                opacity="0.35"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default CyberBackground;
