import React from 'react';
import { LayoutDashboard, MessageSquareText, Sparkles, Bell, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const MobileEntryScreen = ({ onNavigate }) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#d9ff3b]/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full" />

      {/* Header Section */}
      <div className="relative pt-20 pb-12 px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1 bg-[#d9ff3b]/10 border border-[#d9ff3b]/20 rounded-full">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d9ff3b]">Luminescent Architect</span>
            </div>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white leading-[0.9]">
            BUDGET<br/>
            <span className="text-[#d9ff3b]">ASSISTANT.</span>
          </h1>
          <p className="mt-6 text-white/40 text-sm font-medium leading-relaxed max-w-[240px]">
            Gestiona tus finanzas con la potencia de la inteligencia artificial.
          </p>
        </motion.div>
      </div>

      {/* Navigation Cards */}
      <div className="relative flex-1 px-8 space-y-4">
        {/* Dashboard Card */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => onNavigate('dashboard')}
          className="w-full relative group h-32 overflow-hidden rounded-[2rem] bg-white/[0.03] border border-white/10 p-6 flex items-center justify-between transition-colors hover:bg-white/[0.06] hover:border-[#d9ff3b]/30"
        >
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.05] flex items-center justify-center border border-white/10 group-hover:bg-[#d9ff3b] group-hover:border-transparent transition-all duration-500">
              <LayoutDashboard className="w-6 h-6 text-white group-hover:text-black transition-colors" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold text-white tracking-tight">Dashboard</h2>
              <p className="text-xs text-white/30 font-medium">Balance & Movimientos</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-[#d9ff3b] group-hover:translate-x-1 transition-all" />
        </motion.button>

        {/* AI Chat Card (Highlighted) */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => onNavigate('chat')}
          className="w-full relative group h-44 overflow-hidden rounded-[2.5rem] bg-[#d9ff3b] p-8 flex flex-col justify-between text-left"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles className="w-32 h-32 -mr-10 -mt-10 text-black" />
          </div>
          <div className="flex justify-between items-start relative z-10">
            <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center">
              <MessageSquareText className="w-6 h-6 text-[#d9ff3b]" />
            </div>
            <div className="px-3 py-1 bg-black/10 rounded-full">
              <span className="text-[9px] font-black uppercase tracking-widest text-black/60">Ai Powered</span>
            </div>
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-black tracking-tight leading-none mb-1">INTELIGENCIA<br/>ARTIFICIAL</h2>
            <p className="text-[10px] text-black/60 font-bold uppercase tracking-widest">Habla con tu asistente</p>
          </div>
        </motion.button>

        {/* Pending Actions Card */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => onNavigate('pending_actions')}
          className="w-full relative group h-24 overflow-hidden rounded-[1.5rem] bg-white/[0.03] border border-white/10 p-5 flex items-center justify-between transition-colors hover:bg-white/[0.06]"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center border border-white/10 group-hover:border-cyan-400/30">
              <Bell className="w-5 h-5 text-white group-hover:text-cyan-400 transition-colors" />
            </div>
            <div className="text-left">
              <h2 className="text-md font-bold text-white tracking-tight">Acciones</h2>
              <p className="text-[10px] text-white/30 font-medium">Por completar</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
             <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-cyan-400" />
          </div>
        </motion.button>
      </div>

      {/* Footer */}
      <div className="p-12 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 1 }}
          className="text-[10px] font-bold text-white uppercase tracking-[0.3em]"
        >
          Powered by DeepMind Agents
        </motion.p>
      </div>
    </div>
  );
};

export default MobileEntryScreen;
