import React from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Settings, Cpu, Volume2 } from 'lucide-react';

export default function Assistant({ isListening, assistantState, assistantReply, transcript, interimTranscript, onToggleListen }) {
  
  // Mapeo de colores y efectos según el estado del asistente
  const getOrbStyle = () => {
    switch (assistantState) {
      case 'listening':
        return {
          glow: 'shadow-glow border-cyber-blue',
          core: 'bg-gradient-to-r from-cyan-400 to-emerald-400',
          speed: 2,
          scale: [1, 1.15, 1],
        };
      case 'processing':
        return {
          glow: 'shadow-glowPurple border-cyber-purple',
          core: 'bg-gradient-to-r from-fuchsia-500 to-violet-500',
          speed: 0.6,
          scale: [1, 0.9, 1.1, 1],
        };
      case 'speaking':
        return {
          glow: 'shadow-glowGreen border-cyber-green',
          core: 'bg-gradient-to-r from-emerald-400 to-cyan-500',
          speed: 1.2,
          scale: [1, 1.08, 0.95, 1.05, 1],
        };
      case 'idle':
      default:
        return {
          glow: 'border-cyan-900/40 shadow-innerGlow',
          core: 'bg-gradient-to-r from-blue-900/60 to-slate-800/80 border border-cyan-500/20',
          speed: 4,
          scale: [1, 1.04, 1],
        };
    }
  };

  const style = getOrbStyle();

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-between min-h-[400px] relative overflow-hidden">
      {/* Grid decorativo de fondo */}
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
      
      {/* Encabezado */}
      <div className="w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Cpu className={`w-4 h-4 ${isListening ? 'text-cyber-blue animate-pulse' : 'text-slate-500'}`} />
          <span className="text-[10px] font-orbitron tracking-widest text-slate-400 uppercase">
            Core AI - NEXUS v1.0
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-cyber-blue animate-ping' : 'bg-red-500'}`} />
          <span className="text-[9px] font-orbitron text-slate-400 uppercase">
            {isListening ? 'LIVE' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Orbe Central Jarvis */}
      <div className="relative flex items-center justify-center my-8 z-10">
        
        {/* Onda radial de sonido exterior (Solo cuando escucha/habla) */}
        {(assistantState === 'listening' || assistantState === 'speaking') && (
          <>
            <motion.div
              className={`absolute rounded-full border border-cyan-400/20 w-44 h-44`}
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
            />
            <motion.div
              className={`absolute rounded-full border border-cyan-400/10 w-44 h-44`}
              animate={{ scale: [1, 2.1], opacity: [0.3, 0] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeOut', delay: 0.5 }}
            />
          </>
        )}

        {/* Anillo exterior rotatorio */}
        <motion.div
          className={`w-36 h-36 rounded-full border-2 border-dashed flex items-center justify-center p-2 ${style.glow}`}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: style.speed * 8, ease: 'linear' }}
        />

        {/* Anillo intermedio */}
        <motion.div
          className="absolute w-28 h-28 rounded-full border border-cyan-500/30 border-t-cyber-blue border-b-cyber-purple"
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: style.speed * 12, ease: 'linear' }}
        />

        {/* Núcleo del Orbe */}
        <motion.button
          onClick={onToggleListen}
          className={`absolute w-20 h-20 rounded-full flex items-center justify-center z-20 cursor-pointer ${style.core} shadow-lg`}
          animate={{ scale: style.scale }}
          transition={{ repeat: Infinity, duration: style.speed, ease: 'easeInOut' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isListening ? (
            <Mic className="w-8 h-8 text-slate-900 drop-shadow" />
          ) : (
            <MicOff className="w-8 h-8 text-cyan-400 drop-shadow" />
          )}
        </motion.button>
      </div>

      {/* Transcripción e Indicador de Voz */}
      <div className="w-full text-center z-10 flex flex-col gap-3">
        {/* Respuesta del asistente */}
        <div className="min-h-[48px] flex flex-col justify-center">
          {assistantReply ? (
            <motion.p 
              key={assistantReply}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-cyber-blue font-medium px-2 italic"
            >
              &ldquo;{assistantReply}&rdquo;
            </motion.p>
          ) : (
            <p className="text-xs text-slate-500">Haz clic en el orbe para iniciar comandos por voz</p>
          )}
        </div>

        {/* Transcripción en tiempo real */}
        <div className="bg-slate-950/60 border border-slate-800/40 rounded-xl p-3 min-h-[64px] flex flex-col justify-center items-center text-xs">
          {interimTranscript && (
            <span className="text-slate-400 animate-pulse italic">
              {interimTranscript}...
            </span>
          )}
          {transcript && !interimTranscript && (
            <span className="text-slate-200 font-mono text-neon-blue">
              &gt; {transcript}
            </span>
          )}
          {!transcript && !interimTranscript && (
            <span className="text-[10px] font-orbitron tracking-wider text-slate-600 uppercase">
              Consola de Voz Inactiva
            </span>
          )}
        </div>

        {/* Botón de control rápido */}
        <button
          onClick={onToggleListen}
          className={`w-full py-2.5 px-4 rounded-xl font-orbitron text-xs tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
            isListening
              ? 'bg-gradient-to-r from-red-950/40 to-rose-900/30 border border-red-500/30 hover:border-red-500/60 text-red-400 shadow-glowRed/10'
              : 'bg-gradient-to-r from-cyan-950/40 to-blue-900/30 border border-cyan-500/30 hover:border-cyan-500/60 text-cyber-blue shadow-glow/10'
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="w-3.5 h-3.5" />
              Detener Escucha
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 animate-pulse" />
              Iniciar Escucha
            </>
          )}
        </button>
      </div>
    </div>
  );
}
