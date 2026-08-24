import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

const HeroPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const dot = document.getElementById("cursorDot");
    const ring = document.getElementById("cursorRing");

    let mouseX = 0,
      mouseY = 0;
    let ringX = 0,
      ringY = 0;

    let animationFrameId;

    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (dot) {
        dot.style.left = mouseX + "px";
        dot.style.top = mouseY + "px";
      }
    };

    const animate = () => {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;

      if (ring) {
        ring.style.left = ringX + "px";
        ring.style.top = ringY + "px";
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", onMouseMove);
    animate();

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="custom-cursor-active bg-[#0b1221] text-slate-100 font-sans min-h-screen overflow-x-hidden selection:bg-[#c89f53] selection:text-[#0b1221]">
      <div className="cursor-dot" id="cursorDot"></div>
      <div className="cursor-ring" id="cursorRing"></div>

      <main className="min-h-screen flex items-center justify-center">
        <section className="cinematic-bg relative min-h-screen w-full flex flex-col justify-center items-center text-center overflow-hidden px-6 md:px-20 py-10 gap-8">
          {/* Grid Texture */}
          <div className="absolute inset-0 tech-grid z-0 opacity-50"></div>

          {/* Central Ambient Glows */}
          <div className="ambient-glow bg-[#c89f53] w-[400px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 mix-blend-screen"></div>
          <div
            className="ambient-glow bg-[#e8c872] w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 mix-blend-screen"
            style={{ animationDelay: "2s" }}
          ></div>

          {/* Text Content */}
          <div className="relative z-10 w-full flex flex-col items-center max-w-3xl">
            {/* Micro-label */}
            <div className="stagger-1 font-[JetBrains_Mono] text-[#9d8ba0] text-[12px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2 bg-[rgba(255,255,255,0.03)] px-4 py-1.5 rounded-full border border-[rgba(255,255,255,0.12)] backdrop-blur-sm">
              <span className="text-[#e8c872] font-bold">
                cout &lt;&lt; Masters;
              </span>
              <span className="w-1 h-1 rounded-full bg-[#c89f53] mx-2"></span>
              <span>Coded for MCA Coders</span>
            </div>

            {/* Logo Container - Between label and title */}
            <div className="stagger-2 relative z-10 w-full flex justify-center animate-float mb-6">
              <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full overflow-hidden drop-shadow-[0_0_30px_rgba(200,159,83,0.4)] relative z-20 flex items-center justify-center">
                <img
                  src={logo}
                  alt="Cout Masters Logo"
                  className="w-full h-full object-cover scale-[1.05]"
                />
              </div>
            </div>

            {/* Title */}
            <h1 className="stagger-3 font-['Geist'] text-5xl sm:text-7xl lg:text-8xl text-white font-black tracking-tighter mb-6 glowing-text drop-shadow-2xl">
              backTrack
            </h1>

            {/* Description */}
            <p className="stagger-4 text-lg sm:text-xl text-[#d4c0d7] mb-10 max-w-2xl leading-relaxed">
              Think recursively. Solve relentlessly.
            </p>

            {/* Info Chips */}
            <div className="stagger-5 flex flex-wrap justify-center gap-3 sm:gap-4 mb-12">
              <div className="font-[JetBrains_Mono] text-xs sm:text-sm px-4 py-2 rounded-md bg-white/5 border border-white/10 text-[#e8c872] flex items-center gap-2 backdrop-blur-sm">
                <span className="material-symbols-outlined text-[16px]">
                  code
                </span>
                CODING CONTEST
              </div>
              <div className="font-[JetBrains_Mono] text-xs sm:text-sm px-4 py-2 rounded-md bg-white/5 border border-white/10 text-[#e4e1ed] flex items-center gap-2 backdrop-blur-sm">
                <span className="material-symbols-outlined text-[16px]">
                  calendar_today
                </span>
                10 September 2026
              </div>
              <div className="font-[JetBrains_Mono] text-xs sm:text-sm px-4 py-2 rounded-md bg-white/5 border border-white/10 text-[#c89f53] flex items-center gap-2 backdrop-blur-sm">
                <span className="material-symbols-outlined text-[16px]">
                  school
                </span>
                MCA
              </div>
            </div>

            {/* CTA */}
            <div className="stagger-6">
              <button
                onClick={() => navigate("/login")}
                className="relative group overflow-hidden rounded-full p-[2px] font-[JetBrains_Mono] text-xs font-bold tracking-widest uppercase transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[#c89f53] via-[#e8c872] to-[#c89f53] opacity-70 group-hover:opacity-100 group-hover:animate-pulse"></span>
                <span className="relative flex items-center gap-3 bg-[#0b1221] px-10 py-4 rounded-full transition-all group-hover:bg-opacity-0 group-hover:text-white">
                  LOGIN
                  <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HeroPage;
