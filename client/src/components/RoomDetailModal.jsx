import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSmartHome } from '../context/SmartHomeContext';
import { useAudioSynth } from '../hooks/useAudioSynth';
import { 
  X, Lightbulb, Fan, Flame, Tv, Music, Gamepad2, 
  ArrowUp, ArrowDown, ShieldAlert, Thermometer, Info
} from 'lucide-react';

export default function RoomDetailModal({ roomKey, onClose }) {
  const { homeState, triggerManualControl, garageAccessLogs } = useSmartHome();
  const { playSound } = useAudioSynth();
  const roomData = homeState[roomKey];

  // Reloj digital en tiempo real para la habitación
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Estado local para el mini juego arcade en la Sala
  const [gameState, setGameState] = useState('idle'); // idle, waiting, flash, win, fail
  const [gameScore, setGameScore] = useState(0);
  const [reactionTimer, setReactionTimer] = useState(null);

  if (!roomData) return null;

  // --- LÓGICA DE MINI JUEGO ARCADE (SALA) ---
  const startArcadeGame = () => {
    playSound('click');
    setGameState('waiting');
    
    // Esperar un tiempo aleatorio entre 1.5 y 4 segundos para flashear
    const delay = Math.floor(Math.random() * 2500) + 1500;
    const timer = setTimeout(() => {
      setGameState('flash');
      // Iniciar marca de tiempo
      setReactionTimer(Date.now());
    }, delay);

    setReactionTimer(timer);
  };

  const pressArcadeButton = () => {
    if (gameState === 'flash') {
      const duration = Date.now() - reactionTimer;
      if (duration < 500) {
        // Victoria!
        playSound('success');
        setGameState('win');
        setGameScore(prev => prev + 10);
        // Reportar puntuación
        triggerManualControl('sala', 'gameScore', gameScore + 10, 'JUEGO_ON');
      } else {
        playSound('error');
        setGameState('fail');
      }
    } else {
      // Presionó antes del flash -> Falla
      playSound('error');
      if (reactionTimer) clearTimeout(reactionTimer);
      setGameState('fail');
    }
  };

  const resetArcadeGame = () => {
    playSound('click');
    setGameState('idle');
    setGameScore(0);
    triggerManualControl('sala', 'gameScore', 0, 'JUEGO_ON');
  };

  useEffect(() => {
    return () => {
      if (reactionTimer && typeof reactionTimer === 'number') clearTimeout(reactionTimer);
    };
  }, [reactionTimer]);

  // --- RENDERING ESPECÍFICO DE HABITACIONES ---

  const renderBanoControls = () => {
    const modes = [
      { id: 'MANANA', label: 'Modo Mañana', color: 'bg-cyan-500', cmd: 'MANANA', hex: '#00f0ff', desc: 'Luz azul neón' },
      { id: 'SPA', label: 'Modo Spa', color: 'bg-rose-500', cmd: 'SPA', hex: '#ff0055', desc: 'Luz roja relax' },
      { id: 'NOCHE', label: 'Modo Noche', color: 'bg-emerald-500', cmd: 'NOCHE', hex: '#00ff66', desc: 'Luz verde tenue' },
      { id: 'OFF', label: 'Apagar Baño', color: 'bg-slate-600', cmd: 'OFF', hex: '#64748b', desc: 'Apagar LED y OLED' }
    ];

    const handleModeClick = (mId, mCmd) => {
      triggerManualControl('bano', 'mode', mId, mCmd);
      triggerManualControl('bano', 'state', mId === 'OFF' ? 'OFF' : 'ON', mCmd);
    };

    return (
      <div className="flex flex-col gap-6">
        {/* Simulación Pantalla OLED del Baño */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-orbitron text-slate-500 uppercase tracking-wider">Display OLED Físico (128x64)</span>
          <div className="w-full h-24 bg-slate-950 border-2 border-slate-800 rounded-xl p-3 flex flex-col justify-between font-mono relative overflow-hidden">
            <div className="absolute top-1 right-2 text-[8px] text-amber-500/80 animate-pulse">OLED: SSD1306</div>
            <div className="text-[10px] text-cyan-400 font-bold border-b border-cyan-950 pb-1 flex justify-between">
              <span>NEXUS SH: BAÑO</span>
              <span>TEM: 24°C</span>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center">
              {roomData.mode === 'OFF' ? (
                <>
                  <span className="text-[13px] text-slate-300 font-bold tracking-widest uppercase">
                    Bano
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide mt-0.5">
                    Apagado
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[13px] text-white tracking-widest font-semibold font-orbitron" style={{ color: roomData.rgbColor }}>
                    {roomData.mode === 'SPA' ? 'Modo Spa' : roomData.mode === 'MANANA' ? 'Modo Manana' : 'Modo Noche'}
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium uppercase mt-0.5">
                    {roomData.mode === 'SPA' ? 'Luz Roja' : roomData.mode === 'MANANA' ? 'Luz Azul' : 'Luz Verde'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Botones de Selección */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-orbitron text-slate-500 uppercase tracking-wider">Modos Inteligentes</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {modes.map((m) => {
              const isActive = roomData.mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleModeClick(m.id, m.cmd)}
                  className={`p-3 rounded-xl border flex flex-col gap-1.5 text-left transition-all ${
                    isActive 
                      ? 'bg-slate-900 border-white/20 shadow-glow/10'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                  style={{
                    borderColor: isActive ? m.hex : 'rgba(30, 41, 59, 0.5)',
                    boxShadow: isActive ? `0 0 15px ${m.hex}22, inset 0 0 10px ${m.hex}11` : 'none'
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${m.color}`} style={{ boxShadow: `0 0 8px ${m.hex}` }} />
                    <span className="font-orbitron font-semibold text-[10px] text-slate-200">{m.label}</span>
                  </div>
                  <span className="text-[8px] text-slate-500 leading-normal">{m.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderCocinaControls = () => {
    return (
      <div className="flex flex-col gap-6">
        {/* Sensores en Vivo (DHT11, Gas MQ, Flame) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Temperatura */}
          <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <Thermometer className="w-6 h-6 text-orange-500 mb-1.5" />
            <span className="text-[9px] text-slate-500 font-mono">TEMPERATURA</span>
            <span className="text-base font-orbitron font-extrabold text-slate-200 mt-0.5">
              {roomData.temp !== undefined ? `${roomData.temp}°C` : '24.0°C'}
            </span>
          </div>

          {/* Humedad */}
          <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-cyan-500 mb-1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className="text-[9px] text-slate-500 font-mono">HUMEDAD</span>
            <span className="text-base font-orbitron font-extrabold text-slate-200 mt-0.5">
              {roomData.humidity !== undefined ? `${roomData.humidity}%` : '50.0%'}
            </span>
          </div>

          {/* Gas MQ */}
          <div className={`border rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all ${
            roomData.gasAlert ? 'bg-red-950/40 border-red-500/30' : 'bg-slate-950/60 border-slate-900'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 mb-1.5 ${
              roomData.gasAlert ? 'text-red-500 animate-bounce' : 'text-yellow-500'
            }`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="text-[9px] text-slate-500 font-mono">GAS MQ</span>
            <span className={`text-base font-orbitron font-extrabold mt-0.5 ${roomData.gasAlert ? 'text-cyber-red' : 'text-slate-200'}`}>
              {roomData.gasLevel !== undefined ? `${roomData.gasLevel}` : '120'} ppm
            </span>
          </div>

          {/* Fuego */}
          <div className={`border rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all ${
            roomData.fireAlert ? 'bg-red-950/60 border-red-500/50 shadow-glowRed/10' : 'bg-slate-950/60 border-slate-900'
          }`}>
            <Flame className={`w-6 h-6 mb-1.5 ${
              roomData.fireAlert ? 'text-red-500 animate-ping' : 'text-slate-600'
            }`} />
            <span className="text-[9px] text-slate-500 font-mono">FUEGO</span>
            <span className={`text-[10px] font-orbitron font-extrabold mt-1.5 uppercase ${
              roomData.fireAlert ? 'text-cyber-red animate-pulse' : 'text-cyber-green'
            }`}>
              {roomData.fireAlert ? 'CRÍTICO' : 'SEGURO'}
            </span>
          </div>
        </div>

        {/* Alertas Críticas Activas en UI */}
        {(roomData.fireAlert || roomData.gasAlert) && (
          <div className="flex flex-col gap-2">
            {roomData.fireAlert && (
              <div className="bg-red-950/30 border-2 border-red-600/40 rounded-xl p-3 flex items-center gap-3 text-cyber-red text-xs animate-pulse">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <span className="font-orbitron font-bold">¡ALERTA CRÍTICA DE INCENDIO!</span>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">El sensor de llama reporta fuego activo. Alarma sonora y RGB parpadeante.</p>
                </div>
              </div>
            )}
            {roomData.gasAlert && (
              <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-3 flex items-center gap-3 text-cyber-red text-xs">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <span className="font-orbitron font-bold">FUGA DE GAS DETECTADA</span>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Gas combustible supera los 500 ppm ({roomData.gasLevel} ppm). Ventilación sugerida.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Control Manual de Dispositivos */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-orbitron text-slate-500 uppercase tracking-wider">Control de Dispositivos (RGB Canal Verde/Azul)</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Nevera */}
            <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 flex flex-col justify-between items-center gap-4">
              <span className="text-xs font-semibold text-slate-200">Nevera Inteligente</span>
              <button
                onClick={() => triggerManualControl('cocina', 'nevera', !roomData.nevera, roomData.nevera ? 'off' : 'nevera')}
                className={`w-full py-2 rounded-lg text-xs font-semibold font-orbitron transition-all ${
                  roomData.nevera ? 'bg-blue-600 text-white shadow-glow/10' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {roomData.nevera ? 'AZUL (ON)' : 'ENCENDER'}
              </button>
            </div>

            {/* Iluminación */}
            <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 flex flex-col justify-between items-center gap-4">
              <span className="text-xs font-semibold text-slate-200">Luz Cocina</span>
              <button
                onClick={() => triggerManualControl('cocina', 'lights', !roomData.lights, roomData.lights ? 'off' : 'cocina')}
                className={`w-full py-2 rounded-lg text-xs font-semibold font-orbitron transition-all ${
                  roomData.lights ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {roomData.lights ? 'VERDE (ON)' : 'ENCENDER'}
              </button>
            </div>

            {/* Estufa */}
            <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 flex flex-col justify-between items-center gap-4">
              <span className="text-xs font-semibold text-slate-200">Estufa Eléctrica</span>
              <button
                onClick={() => triggerManualControl('cocina', 'stove', !roomData.stove, roomData.stove ? 'off' : 'estufa')}
                className={`w-full py-2 rounded-lg text-xs font-semibold font-orbitron transition-all ${
                  roomData.stove ? 'bg-cyan-600 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {roomData.stove ? 'CYAN (ON)' : 'ENCENDER'}
              </button>
            </div>
          </div>
          
          {/* Apagar Cocina */}
          <button
            onClick={() => {
              triggerManualControl('cocina', 'lights', false, 'off');
              triggerManualControl('cocina', 'stove', false, 'off');
              triggerManualControl('cocina', 'nevera', false, 'off');
            }}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-orbitron tracking-wider transition-all"
          >
            APAGAR TODO (OFF)
          </button>
        </div>
      </div>
    );
  };

  const renderSalaControls = () => {
    // Teclas del piano virtual (Do, Re, Mi, Fa, Sol, La, Si, Do)
    const pianoNotes = [
      { key: 'C', note: 'Do', index: 0 },
      { key: 'D', note: 'Re', index: 1 },
      { key: 'E', note: 'Mi', index: 2 },
      { key: 'F', note: 'Fa', index: 3 },
      { key: 'G', note: 'Sol', index: 4 },
      { key: 'A', note: 'La', index: 5 },
      { key: 'B', note: 'Si', index: 6 },
      { key: 'C2', note: 'Do', index: 7 }
    ];

    const playPianoKey = (noteIndex) => {
      // Reproducir sonido procedural en el frontend
      playSoundNote(noteIndex);
      // Enviar comando serial al Arduino
      triggerManualControl('sala', 'piano', true, `PLAY_NOTE:${noteIndex}`);
    };

    // Synthesizer de notas por Web Audio
    const playSoundNote = (idx) => {
      const frequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequencies[idx], audioCtx.currentTime);
        
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } catch (e) {
        console.warn(e);
      }
    };

    return (
      <div className="flex flex-col gap-6">
        
        {/* Panel Multimedia TV */}
        <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-orbitron text-slate-500 uppercase tracking-wider">Centro Multimedia TV</span>
            <button
              onClick={() => triggerManualControl('sala', 'tv', !roomData.tv, roomData.tv ? 'TV_OFF' : 'TV_ON')}
              className={`py-1 px-3 rounded-lg text-[10px] font-orbitron tracking-wider ${
                roomData.tv ? 'bg-cyber-red text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {roomData.tv ? 'APAGAR TELEVISOR' : 'ENCENDER TELEVISOR'}
            </button>
          </div>
          
          <div className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden">
            {roomData.tv ? (
              <div className="flex flex-col items-center gap-1 text-center">
                <Tv className="w-8 h-8 text-cyber-blue animate-pulse" />
                <span className="text-[10px] text-slate-400 font-mono">SEÑAL: HDMI 1 (ACTIVE)</span>
                <span className="text-xs font-semibold text-cyber-green tracking-wider font-orbitron">NETFLIX SMART HOME</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-slate-700">
                <Tv className="w-8 h-8" />
                <span className="text-[9px] font-orbitron uppercase tracking-widest">SYSTEM STANDBY</span>
              </div>
            )}
            <div className="absolute bottom-1 right-2 text-[7px] text-slate-600 font-mono">SAMSUNG 55&quot; CORE</div>
          </div>
        </div>

        {/* Sección del Teclado de Piano Simulado */}
        <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-orbitron text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Music className="w-3.5 h-3.5 text-cyber-blue" /> Piano Eléctrico
            </span>
            <button
              onClick={() => triggerManualControl('sala', 'piano', !roomData.piano, 'PIANO_ON')}
              className={`py-1 px-2 text-[9px] font-orbitron rounded-lg border ${
                roomData.piano ? 'bg-cyan-950/20 text-cyber-blue border-cyan-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              {roomData.piano ? 'PIANO ACTIVO' : 'ACTIVAR PIANO'}
            </button>
          </div>

          <div className="flex justify-center bg-slate-900/60 p-3 rounded-xl border border-slate-950 gap-1 overflow-x-auto select-none">
            {pianoNotes.map((n) => (
              <button
                key={n.index}
                onClick={() => playPianoKey(n.index)}
                className="w-8 h-20 bg-white border border-slate-300 rounded-b hover:bg-slate-200 active:bg-cyan-100 flex flex-col justify-end pb-2 items-center shadow-md transition-colors"
              >
                <span className="text-[10px] text-slate-900 font-bold font-mono">{n.key}</span>
                <span className="text-[8px] text-slate-500 font-sans">{n.note}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sección del Mini Juego Arcade */}
        <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-orbitron text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Gamepad2 className="w-3.5 h-3.5 text-cyber-purple animate-bounce" /> Arcade Mini-Game
            </span>
            <span className="text-[10px] font-orbitron text-cyber-purple font-bold">
              SCORE: {gameScore}
            </span>
          </div>

          <div className="flex flex-col items-center bg-slate-950 border border-slate-900 rounded-xl p-4 gap-4">
            
            {/* Pantalla del juego */}
            <div className="w-full h-16 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 font-mono text-center">
              {gameState === 'idle' && <span className="text-xs text-slate-400">Presiona INICIAR para jugar</span>}
              {gameState === 'waiting' && <span className="text-xs text-cyber-orange animate-pulse">ESPERA AL FLASH...</span>}
              {gameState === 'flash' && (
                <span className="text-xs text-slate-950 font-bold bg-cyber-green px-6 py-2 rounded shadow-glowGreen uppercase animate-ping">
                  ¡¡ PRESIONA YA !!
                </span>
              )}
              {gameState === 'win' && <span className="text-xs text-cyber-green font-bold uppercase">¡ BUEN TIEMPO ! +10 PTS</span>}
              {gameState === 'fail' && <span className="text-xs text-cyber-red font-bold uppercase">FALLO / MUY LENTO</span>}
            </div>

            {/* Mandos */}
            <div className="flex gap-2 w-full">
              {gameState === 'idle' || gameState === 'win' || gameState === 'fail' ? (
                <button
                  onClick={startArcadeGame}
                  className="flex-1 py-1.5 bg-cyber-purple hover:bg-fuchsia-600 text-white rounded-lg text-xs font-orbitron tracking-wider transition-all"
                >
                  INICIAR JUEGO
                </button>
              ) : (
                <button
                  onClick={pressArcadeButton}
                  className="flex-1 py-2 bg-cyber-red hover:bg-rose-600 text-white rounded-lg text-xs font-orbitron font-bold tracking-widest transition-all"
                >
                  ¡ BOTÓN ROJO !
                </button>
              )}
              
              <button
                onClick={resetArcadeGame}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs transition-all"
              >
                Reset
              </button>
            </div>

          </div>
        </div>

      </div>
    );
  };

  const renderHabitacionControls = () => {
    return (
      <div className="flex flex-col gap-6">
        
        {/* Simulación Pantalla OLED del Cuarto */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-orbitron text-slate-500 uppercase tracking-wider">Display OLED de la Habitación (128x64)</span>
          <div className="w-full h-24 bg-slate-950 border-2 border-slate-800 rounded-xl p-3 flex flex-col justify-between font-mono relative overflow-hidden">
            <div className="absolute top-1 right-2 text-[8px] text-amber-500/80 animate-pulse">OLED: SSD1306</div>
            <div className="text-[10px] text-cyan-400 font-bold border-b border-cyan-950 pb-1 flex justify-between">
              <span>NEXUS H: HABITACIÓN</span>
              <span>DHT11</span>
            </div>
            
            <div className="flex-1 flex justify-between items-center mt-2 px-2">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 uppercase">Reloj Digital</span>
                <span className="text-xs text-white font-orbitron font-extrabold tracking-wider">
                  {currentTime}
                </span>
              </div>
              <div className="text-[9px] text-slate-300 space-y-0.5 text-right font-mono">
                <div>TEMP: <span className="text-orange-400 font-bold">{roomData.temp !== undefined ? `${roomData.temp}°C` : '24.0°C'}</span></div>
                <div>HUM: <span className="text-cyan-400 font-bold">{roomData.humidity !== undefined ? `${roomData.humidity}%` : '50%'}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Persiana Motorizada (Servo Continuo 360°) */}
        <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200">Persiana Automática (Servo 360° Continuo)</span>
              <span className="text-[9px] text-slate-500">Mapeado a Arduino 2 Pin D9</span>
            </div>
            <span className="text-xs font-orbitron font-bold text-amber-500">
              {roomData.blinds === 100 ? 'Abierta' : roomData.blinds === 0 ? 'Cerrada' : 'Ajustada'}
            </span>
          </div>

          {/* Selector de persiana */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => triggerManualControl('habitacion', 'blinds', 100, 'ABRIR_PERSIANA')}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-800 hover:border-cyber-blue bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-cyber-blue text-xs font-orbitron flex flex-col items-center gap-1 transition-all"
            >
              <ArrowUp className="w-4 h-4 animate-bounce" />
              Subir / Abrir Persiana
            </button>
            <button
              onClick={() => triggerManualControl('habitacion', 'blinds', 0, 'CERRAR_PERSIANA')}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-800 hover:border-cyber-blue bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-cyber-blue text-xs font-orbitron flex flex-col items-center gap-1 transition-all"
            >
              <ArrowDown className="w-4 h-4 animate-bounce" style={{ animationDelay: '0.2s' }} />
              Bajar / Cerrar Persiana
            </button>
          </div>
        </div>

        {/* Datos Ambientales Compartidos */}
        <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-orange-400" />
            <span className="text-xs font-semibold text-slate-300">Monitoreo Climatización</span>
          </div>
          <span className="text-xs font-orbitron text-slate-400 font-bold">
            {roomData.temp !== undefined ? `${roomData.temp}°C` : '24.0°C'} / {roomData.humidity !== undefined ? `${roomData.humidity}%` : '50%'} HR
          </span>
        </div>

      </div>
    );
  };

  const renderGarajeControls = () => {
    const isOpen = roomData.door === 'OPEN';

    return (
      <div className="flex flex-col gap-6">
        
        {/* Accionamiento Servo */}
        <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200">Servo Portón (Pin 9)</span>
              <span className="text-[9px] text-slate-500">Ángulo Servo: {isOpen ? '90° (Abierto)' : '0° (Cerrado)'}</span>
            </div>
            <span className={`text-xs font-orbitron font-bold ${isOpen ? 'text-cyber-green text-neon-green' : 'text-slate-500'}`}>
              {isOpen ? 'PUERTA ABIERTA' : 'PUERTA CERRADA'}
            </span>
          </div>
        </div>

        {/* Telemetría HC-SR04 */}
        <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200">Radar Sensor de Proximidad HC-SR04</span>
            <span className={`text-xs font-orbitron font-bold ${roomData.distance < 5 ? 'text-cyber-red animate-pulse' : 'text-cyber-blue'}`}>
              {roomData.distance} cm
            </span>
          </div>

          {/* Gráfico del sensor */}
          <div className="w-full h-16 bg-slate-900 border border-slate-950 rounded-xl relative flex items-center p-3 overflow-hidden">
            {/* Sensor */}
            <div className="w-4 h-full bg-slate-950 border-r border-cyan-800 flex items-center justify-center">
              <div className="w-1.5 h-6 bg-cyber-blue animate-ping rounded-full" />
            </div>

            {/* Zona de peligro (5cm) */}
            <div className="absolute left-4 top-0 bottom-0 w-8 bg-red-500/10 border-r border-red-500/20" />

            {/* Coche simulado */}
            <motion.div
              className="absolute h-8 w-14 bg-gradient-to-r from-blue-900 to-indigo-700 border border-cyan-500/30 rounded-lg flex items-center justify-center text-[8px] font-bold text-cyan-200 shadow-lg"
              animate={{ 
                left: `${Math.min(90, Math.max(15, (roomData.distance / 30) * 100))}%`
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              [ CAR ]
            </motion.div>

            {/* Marcadores de distancia */}
            <div className="absolute bottom-1 left-6 text-[7px] text-red-500">Peligro (5cm)</div>
            <div className="absolute bottom-1 right-2 text-[7px] text-slate-600">30cm</div>
          </div>
          
          {/* Regla de negocio */}
          <div className="mt-3 flex items-start gap-1.5 text-[9px] text-slate-500 leading-normal">
            <Info className="w-3.5 h-3.5 text-cyber-blue shrink-0 mt-0.5" />
            <span>Si el sensor detecta un obstáculo a menos de 5cm, el Arduino cerrará el portón automáticamente y enviará la señal al panel. Puede simularlo desde el panel lateral izquierdo.</span>
          </div>
        </div>

        {/* Registro de Accesos (Apertura y Cierre) */}
        <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 flex flex-col gap-2.5 max-h-48 overflow-y-auto">
          <span className="text-[10px] font-orbitron text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-cyber-green rounded-full led-indicator led-on" />
            Historial de Accesos del Portón
          </span>
          
          <div className="flex flex-col gap-1.5 font-mono text-[9px]">
            {garageAccessLogs && garageAccessLogs.length > 0 ? (
              garageAccessLogs.map((log) => {
                const dateStr = new Date(log.timestamp).toLocaleTimeString();
                const isOpen = log.action === 'OPEN';
                return (
                  <div key={log.id} className="flex justify-between items-center border-b border-slate-900/40 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">[{dateStr}]</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[8px] tracking-wider ${
                        isOpen ? 'bg-green-950/30 text-cyber-green border border-green-500/20' : 'bg-red-950/30 text-cyber-red border border-red-500/20'
                      }`}>
                        {isOpen ? 'ABIERTO' : 'CERRADO'}
                      </span>
                    </div>
                    <span className="text-slate-400">
                      Distancia: <span className="text-cyber-blue font-bold">{log.distance}cm</span>
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-slate-500 py-3">Sin registros de accesos recientes.</div>
            )}
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fondo oscuro blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-filter backdrop-blur-md"
      />

      {/* Modal principal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="glass-panel w-full max-w-lg rounded-2xl p-6 relative overflow-hidden z-10 flex flex-col max-h-[90vh]"
        style={{
          boxShadow: '0 20px 50px 0 rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 240, 255, 0.2)'
        }}
      >
        {/* Grid decorativo */}
        <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />

        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 z-10">
          <div className="flex flex-col">
            <h3 className="font-orbitron font-semibold text-sm tracking-wider text-neon-blue uppercase">
              Panel Detallado - {roomKey === 'bano' ? 'Baño' : roomKey === 'cocina' ? 'Cocina' : roomKey === 'sala' ? 'Sala' : roomKey === 'habitacion' ? 'Habitación' : 'Garaje'}
            </h3>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Panel de Control Manual</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-800 hover:border-cyber-blue bg-slate-950 text-slate-400 hover:text-cyber-blue transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto z-10 pr-1">
          {roomKey === 'bano' && renderBanoControls()}
          {roomKey === 'cocina' && renderCocinaControls()}
          {roomKey === 'sala' && renderSalaControls()}
          {roomKey === 'habitacion' && renderHabitacionControls()}
          {roomKey === 'garaje' && renderGarajeControls()}
        </div>
      </motion.div>
    </div>
  );
}
