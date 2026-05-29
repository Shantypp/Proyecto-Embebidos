import { useCallback, useRef } from 'react';

export function useAudioSynth() {
  const audioCtxRef = useRef(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume context if it was suspended (browser security policies)
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSound = useCallback((type) => {
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const now = ctx.currentTime;
      
      switch (type) {
        case 'start': {
          // Activación: Pitido ascendente rápido (estilo Jarvis despertando)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
          
          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now);
          osc.stop(now + 0.25);
          break;
        }
        
        case 'success': {
          // Confirmación: Dos notas armónicas ascendentes (estilo comando OK)
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc1.type = 'triangle';
          osc1.frequency.setValueAtTime(523.25, now); // Do 5
          osc1.frequency.setValueAtTime(659.25, now + 0.08); // Mi 5
          
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(783.99, now + 0.08); // Sol 5
          
          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          
          osc1.start(now);
          osc2.start(now + 0.08);
          
          osc1.stop(now + 0.35);
          osc2.stop(now + 0.35);
          break;
        }
        
        case 'error': {
          // Error/Rechazo: Pitido grave y áspero descendente
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.linearRampToValueAtTime(110, now + 0.3);
          
          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now);
          osc.stop(now + 0.35);
          break;
        }

        case 'click': {
          // Click/Tick: Sonido de transición metálica muy corto
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1500, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.04);
          
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }

        default:
          break;
      }
    } catch (e) {
      console.warn('Web Audio API synth fallo:', e);
    }
  }, []);

  return { playSound, initAudio };
}
