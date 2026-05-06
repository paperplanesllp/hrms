/**
 * THE HR SAATHI - PROPRIETARY DESIGN SYSTEM v2.4
 * Core Architecture: React + Tailwind + GSAP-inspired Motion
 * Aesthetic: Minimalist Luxury / Glassmorphism / Earth Organic
 */

import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowUpRight, 
  Fingerprint, 
  Component, 
  ShieldCheck, 
  Activity,
  Zap
} from "lucide-react";

const ARCHITECTURE_MODULES = [
  {
    id: "01",
    title: "2FA Security",
    desc: "Multi-layer authentication architecture with secure verification workflows for enterprise workforce protection.",
    icon: <ShieldCheck strokeWidth={1.2} size={34} />
  },
  {
    id: "02",
    label: "Fiscal",
    title: "Payroll Core",
    desc: "Automated tax and ledger logic with zero-error redundancy.",
    icon: <Zap strokeWidth={1} size={28} />,
    size: "accent"
  },
  {
    id: "03",
    label: "Utility",
    title: "Request Logic",
    desc: "Streamlined leave hierarchies with instant approval architecture.",
    icon: <Component strokeWidth={1} size={28} />,
    size: "standard"
  },
  {
    id: "04",
    label: "Network",
    title: "Encrypted Node",
    desc: "Centralized employee records protected by global enterprise standards.",
    icon: <ShieldCheck strokeWidth={1} size={28} />,
    size: "standard"
  }
];

export default function HrSaathiEnterprise() {
  const navigate = useNavigate();

  useEffect(() => {
    const logoutRedirect = sessionStorage.getItem("logoutRedirect");
    if (logoutRedirect) {
      sessionStorage.removeItem("logoutRedirect");
      navigate(logoutRedirect, { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-[#F5F6F3] selection:bg-[#E7E2DE] selection:text-[#0A0F1C]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100;300;400;600;700&display=swap');

        * { font-family: 'Outfit', sans-serif; -webkit-font-smoothing: antialiased; }

        /* The "Deep Sea" Gradient with Organic Grain */
        .viewport-main {
          background: radial-gradient(circle at 50% -20%, #2F3A55 0%, #0A0F1C 70%);
          position: relative;
          z-index: 0;
        }

        .grain-canvas {
          position: absolute;
          inset: 0;
          background-image: url("https://grainy-gradients.vercel.app/noise.svg");
          opacity: 0.04;
          pointer-events: none; 
          z-index: 1;
        }

        /* Custom Glassmorphism - SetSeek Premium Standard */
        .glass-refraction {
          background: linear-gradient(135deg, rgba(245, 246, 243, 0.04) 0%, rgba(245, 246, 243, 0.01) 100%);
          backdrop-filter: blur(40px);
          border: 1px solid rgba(245, 246, 243, 0.1);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .glass-refraction:hover {
          background: rgba(245, 246, 243, 0.07);
          border-color: rgba(231, 226, 222, 0.3);
          transform: translateY(-10px);
        }

        .hero-mask {
          background: linear-gradient(to bottom, #F5F6F3 40%, #5C6B8A 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .yogurt-glow {
          background: #E7E2DE;
          color: #0A0F1C;
          box-shadow: 0 0 50px rgba(231, 226, 222, 0.2);
          transition: all 0.5s ease;
        }

        .yogurt-glow:hover {
          box-shadow: 0 0 70px rgba(231, 226, 222, 0.4);
          transform: scale(1.02);
        }

        .floating-ambience {
          animation: float 20s ease-in-out infinite;
          filter: blur(150px);
          pointer-events: none;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(60px, -40px); }
        }

        header, section, footer { position: relative; z-index: 10; }
      `}</style>

      <div className="viewport-main min-h-screen overflow-hidden">
        <div className="grain-canvas" />

        {/* Ambient Atmosphere Nodes */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#2F3A55]/20 rounded-full floating-ambience" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-[#5C6B8A]/10 rounded-full floating-ambience" style={{ animationDelay: '-10s' }} />

        {/* --- NAVIGATION: ARCHITECTURAL --- */}
        <header className="flex items-center justify-between px-16 py-12 mx-auto max-w-[1400px]">
          <div className="flex items-center gap-8 group cursor-pointer">
            <div className="relative w-10 h-10 border border-[#E7E2DE]/20 rounded-lg flex items-center justify-center group-hover:border-[#E7E2DE] transition-colors duration-500">
               <div className="w-1.5 h-1.5 bg-[#E7E2DE] rounded-full group-hover:scale-150 transition-transform" />
            </div>
            <span className="text-[#F5F6F3] text-sm font-bold tracking-[0.6em] uppercase">TheHRsaathi</span>
          </div>
          
          <div className="hidden lg:flex items-center gap-16">
            {["System", "Modules", "Network"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#F5F6F3]/30 hover:text-[#E7E2DE] hover:tracking-[0.6em] transition-all">
                {item}
              </a>
            ))}
          </div>

          <Link to="/login" className="yogurt-glow px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.3em]">
            Access Terminal
          </Link>
        </header>

        {/* --- HERO: CINEMATIC --- */}
        <section className="px-16 pt-24 pb-48 mx-auto max-w-[1400px]">
          <div className="mb-10 inline-flex items-center gap-4 px-5 py-2 rounded-full border border-white/5 bg-white/[0.02] backdrop-blur-xl">
             <Activity size={12} className="text-[#E7E2DE]" />
             <span className="text-[#E7E2DE] text-[9px] font-black uppercase tracking-[0.4em]">Proprietary Enterprise v2.6</span>
          </div>

          <h1 className="text-8xl md:text-[140px] font-extralight tracking-tighter leading-[0.85] hero-mask mb-16">
            Where Modern <br />
            <span className="font-semibold italic">Teams Operate.</span>
          </h1>
          
          <div className="flex flex-col md:flex-row items-end justify-between gap-12">
            <p className="max-w-xl text-[#6E6F73] text-xl font-light leading-relaxed tracking-wide text-left">
              Modern infrastructure for people operations.
            </p>
            
            <div className="flex items-center gap-12">
              <button className="group flex items-center gap-6 text-[#E7E2DE] text-[10px] font-black uppercase tracking-[0.5em]">
                Explore System <ArrowUpRight className="group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </section>

        {/* --- BENTO ARCHITECTURE --- */}
        <section id="modules" className="px-16 py-32 mx-auto max-w-[1400px] border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Feature 01: The Command Center */}
            <div className="md:col-span-8 md:row-span-2 glass-refraction rounded-[50px] p-16 flex flex-col justify-between group overflow-hidden">
               <div>
                 <span className="text-[#6E6F73] text-[10px] font-black uppercase tracking-[0.5em] mb-12 block">{ARCHITECTURE_MODULES[0].label}</span>
                 <h3 className="text-6xl font-light text-[#F5F6F3] mb-10 tracking-tighter">{ARCHITECTURE_MODULES[0].title}</h3>
                 <p className="text-[#6E6F73] text-xl font-light leading-relaxed max-w-sm">
                   {ARCHITECTURE_MODULES[0].desc}
                 </p>
               </div>
               <div className="flex justify-between items-end">
                 <div className="w-20 h-20 border border-white/10 rounded-2xl flex items-center justify-center text-[#E7E2DE] group-hover:scale-110 group-hover:border-[#E7E2DE]/40 transition-all duration-700">
                   {ARCHITECTURE_MODULES[0].icon}
                 </div>
                 <span className="text-[#E7E2DE]/30 text-[40px] font-extralight tracking-tighter italic">01</span>
               </div>
            </div>

            {/* Feature 02: High-Contrast Fiscal Card */}
            <div className="md:col-span-4 bg-[#E7E2DE] rounded-[50px] p-16 text-[#0A0F1C] flex flex-col justify-between group cursor-pointer hover:bg-white transition-colors duration-500">
              <div className="flex justify-between items-start">
                <span className="text-[#0A0F1C]/40 text-[10px] font-black uppercase tracking-[0.5em]">{ARCHITECTURE_MODULES[1].label}</span>
                <ArrowUpRight size={24} className="group-hover:rotate-45 transition-transform" />
              </div>
              <div>
                <h3 className="text-4xl font-bold mb-6 tracking-tighter leading-none">{ARCHITECTURE_MODULES[1].title}</h3>
                <p className="text-[#0A0F1C]/70 text-sm font-medium leading-relaxed">
                  {ARCHITECTURE_MODULES[1].desc}
                </p>
              </div>
            </div>

            {/* Modules 03 & 04 */}
            {ARCHITECTURE_MODULES.slice(2).map((module) => (
              <div key={module.id} className="md:col-span-6 glass-refraction rounded-[50px] p-14 flex flex-col justify-between">
                <div>
                   <div className="text-[#5C6B8A] mb-8">{module.icon}</div>
                   <h3 className="text-3xl font-semibold text-[#F5F6F3] mb-4 tracking-tight">{module.title}</h3>
                   <p className="text-[#6E6F73] text-lg font-light leading-relaxed">{module.desc}</p>
                </div>
                <div className="mt-12 w-full h-px bg-white/5 relative">
                   <div className="absolute top-0 right-0 text-[10px] font-black uppercase tracking-[0.4em] pt-4 text-[#E7E2DE]/50">{module.label}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- PERFORMANCE NODES --- */}
        <section className="px-16 py-48 mx-auto max-w-[1400px]">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              {[
                { label: "Architecture", val: "MERN Stack" },
                { label: "Latency", val: "0.02ms" },
                { label: "Security", val: "L3-Level" },
                { label: "Region", val: "IN_PB" }
              ].map((stat, idx) => (
                <div key={idx} className="group cursor-default">
                   <div className="h-px w-full bg-white/5 mb-8 group-hover:bg-[#E7E2DE]/30 transition-colors" />
                   <span className="text-[#6E6F73] text-[9px] font-black uppercase tracking-[0.5em] block mb-4">{stat.label}</span>
                   <span className="text-[#F5F6F3] text-2xl font-light tracking-tighter group-hover:italic transition-all">{stat.val}</span>
                </div>
              ))}
           </div>
        </section>

        {/* --- FOOTER: MINIMALIST HUB --- */}
        <footer className="px-16 py-32 mx-auto max-w-[1400px] border-t border-white/5">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-24">
            <div className="max-w-sm">
               <div className="text-[#F5F6F3] text-sm font-bold tracking-[0.8em] mb-12 uppercase">TheHRsaathi</div>
               <p className="text-[#6E6F73] text-[10px] uppercase tracking-[0.3em] leading-[2.5] font-medium italic">
                 Precision Engineering for <br /> 
                 Professional Human Management. <br />
                 Global Infrastructure v2.6
               </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-24">
              {["System", "Design", "Legal"].map((col) => (
                <div key={col} className="flex flex-col gap-10">
                  <span className="text-[#E7E2DE] text-[9px] font-black uppercase tracking-[0.5em]">{col}</span>
                  <div className="flex flex-col gap-6 text-[#6E6F73] text-[10px] font-bold uppercase tracking-[0.3em]">
                     <a href="#" className="hover:text-white transition-colors">Philosophy</a>
                     <a href="#" className="hover:text-white transition-colors">Core Nodes</a>
                     <a href="#" className="hover:text-white transition-colors">Safety</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-32 pt-12 border-t border-white/5 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.5em] text-[#6E6F73]">
             <span>Developed by Core Systems JAL</span>
             <span>Status: Optimized</span>
          </div>
        </footer>
      </div>
    </div>
  );
}