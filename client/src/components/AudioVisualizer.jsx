import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function AudioVisualizer({ isListening, assistantState }) {
  const [bars, setBars] = useState(Array(18).fill(10));

  // Simular espectro de frecuencia cuando esté escuchando o procesando
  useEffect(() => {
    if (!isListening && assistantState !== 'speaking') {
      setBars(Array(18).fill(4));
      return;
    }

    const interval = setInterval(() => {
      setBars(prev => prev.map(() => {
        const min = assistantState === 'processing' ? 8 : 4;
        const max = assistantState === 'speaking' ? 40 : 25;
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }));
    }, 90);

    return () => clearInterval(interval);
  }, [isListening, assistantState]);

  // Color de la onda de sonido
  const getWaveColor = () => {
    switch (assistantState) {
      case 'processing':
        return 'bg-cyber-purple shadow-glowPurple/30';
      case 'speaking':
        return 'bg-cyber-green shadow-glowGreen/30';
      case 'listening':
      default:
        return 'bg-cyber-blue shadow-glow/30';
    }
  };

  return (
    <div className="w-full flex items-center justify-center gap-1 h-12 px-4 py-2 bg-slate-950/30 rounded-xl border border-slate-900">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className={`w-1 rounded-full transition-all duration-75 ${getWaveColor()}`}
          animate={{ height }}
          style={{ 
            height: `${height}px`,
            boxShadow: isListening || assistantState === 'speaking' ? '0 0 10px var(--tw-shadow-color)' : 'none'
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        />
      ))}
    </div>
  );
}
