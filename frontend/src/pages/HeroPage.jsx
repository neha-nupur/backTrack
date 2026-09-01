import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import CyberBackground from "../components/CyberBackground";

const HeroPage = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-[#030712] text-slate-100 font-sans min-h-screen overflow-x-hidden relative selection:bg-cyan-600 selection:text-white">
      {/* Animated Cyber Background with Running Lines & 01 Streams */}
      <CyberBackground />

      <main className="min-h-screen flex items-center justify-center relative z-10 px-4 py-12">
        <section className="w-full max-w-4xl flex flex-col justify-center items-center text-center">
          {/* Top Micro-label */}
          <div className="stagger-1 font-mono text-[11px] sm:text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-2 bg-[#071120]/80 px-4 py-1.5 rounded-full border border-cyan-500/25 text-slate-300 shadow-[0_0_15px_rgba(14,165,233,0.1)] backdrop-blur-md">
            <span className="text-cyan-400 font-bold">
              cout &lt;&lt; Masters;
            </span>
            <span className="w-1 h-1 rounded-full bg-cyan-400 mx-1"></span>
            <span className="text-slate-400">Coded for MCA Coders</span>
          </div>

          {/* Cout Masters Logo Container */}
          <div className="stagger-2 relative z-10 w-full flex justify-center animate-float mb-6">
            <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full overflow-hidden drop-shadow-[0_0_35px_rgba(14,165,233,0.3)] relative z-20 flex items-center justify-center border border-cyan-500/30 p-1 bg-[#071120]/60 backdrop-blur-sm">
              <img
                src={logo}
                alt="Cout Masters Coding Club Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </div>

          {/* Main Title */}
          <h1 className="stagger-3 font-['Geist'] text-5xl sm:text-7xl lg:text-8xl text-white font-black tracking-tight mb-4" style={{ textShadow: '0 0 8px rgba(56,189,248,0.2), 0 0 20px rgba(14,165,233,0.12)' }}>
            backTrack
          </h1>

          {/* Subtitle / Tagline */}
          <p className="stagger-4 text-base sm:text-lg text-slate-400 mb-8 max-w-xl font-mono leading-relaxed">
            Think recursively. Solve relentlessly.
          </p>

          {/* Info Chips */}
          <div className="stagger-5 flex flex-wrap justify-center gap-2.5 sm:gap-3.5 mb-10">
            <div className="font-mono text-xs sm:text-sm px-4 py-2 rounded-xl bg-[#081326]/80 border border-slate-800 text-cyan-400 flex items-center gap-2 backdrop-blur-md shadow-inner">
              <span className="text-cyan-300 font-bold">&lt;/&gt;</span>
              <span>CODING CONTEST</span>
            </div>
            <div className="font-mono text-xs sm:text-sm px-4 py-2 rounded-xl bg-[#081326]/80 border border-slate-800 text-slate-300 flex items-center gap-2 backdrop-blur-md shadow-inner">
              <span>📅</span>
              <span>4 September 2026</span>
            </div>
            <div className="font-mono text-xs sm:text-sm px-4 py-2 rounded-xl bg-[#081326]/80 border border-slate-800 text-cyan-300 flex items-center gap-2 backdrop-blur-md shadow-inner">
              <span>🎓</span>
              <span>MCA</span>
            </div>
          </div>

          {/* CTA Button — Dark cyber border style */}
          <div className="stagger-6">
            <button
              onClick={() => navigate("/login")}
              className="relative group overflow-hidden px-10 py-3.5 rounded-full font-mono font-bold text-xs sm:text-sm tracking-widest uppercase transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer flex items-center gap-3 border border-slate-600 bg-[#07111f] text-slate-200 hover:border-cyan-500/60 hover:text-white hover:bg-[#0a1628] shadow-lg"
            >
              <span>LOGIN</span>
              <span className="text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all">
                →
              </span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HeroPage;
