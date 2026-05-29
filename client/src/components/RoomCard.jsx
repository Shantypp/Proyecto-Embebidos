import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSmartHome } from '../context/SmartHomeContext';
import {
  Bath, ChefHat, BedDouble, Car,
  Lightbulb, Power, Flame, Thermometer, Info,
  ArrowUp, ArrowDown, ShieldAlert, Camera
} from 'lucide-react';

// URL del stream de video que sirve el script de YOLO (yolo_garage.py)
const YOLO_CAM_URL = 'http://localhost:8090/video_feed';

export default function RoomCard({ roomKey }) {
  const { homeState, triggerManualControl, garageAccessLogs, yoloDetection } = useSmartHome();
  const roomData = homeState[roomKey];

  // Reloj local para la tarjeta de la Habitación
  const [currentTime, setCurrentTime] = useState('');

  // Estado de la cámara YOLO (para mostrar placeholder si el stream no está activo)
  const [camError, setCamError] = useState(false);

  // Si la cámara falla (YOLO apagado), reintentar cada 4s por si la encienden luego
  useEffect(() => {
    if (!camError) return;
    const t = setTimeout(() => setCamError(false), 4000);
    return () => clearTimeout(t);
  }, [camError]);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!roomData) return null;

  // Render Baño
  const renderBano = () => {
    const modes = [
      { id: 'MANANA', label: 'Mañana', color: 'bg-cyan-500', cmd: 'MANANA', hex: '#00f0ff' },
      { id: 'SPA', label: 'Spa', color: 'bg-rose-500', cmd: 'SPA', hex: '#ff0055' },
      { id: 'NOCHE', label: 'Noche', color: 'bg-emerald-500', cmd: 'NOCHE', hex: '#00ff66' },
      { id: 'OFF', label: 'Apagar', color: 'bg-slate-600', cmd: 'OFF', hex: '#64748b' }
    ];

    const handleModeClick = (mId, mCmd) => {
      triggerManualControl('bano', 'mode', mId, mCmd);
      triggerManualControl('bano', 'state', mId === 'OFF' ? 'OFF' : 'ON', mCmd);
    };

    return (
      <div className="flex flex-col gap-4 mt-4">
        {/* OLED Display */}
        <div className="w-full h-16 bg-slate-950 border border-slate-800 rounded-xl p-2 flex flex-col justify-between font-mono relative overflow-hidden">
          <div className="text-[8px] text-cyan-400 font-bold border-b border-cyan-950 pb-0.5 flex justify-between">
            <span>NEXUS: BAÑO</span>
            <span>TEM: 24°C</span>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center">
            {roomData.mode === 'OFF' ? (
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Apagado</span>
            ) : (
              <span className="text-[11px] font-bold font-orbitron" style={{ color: roomData.rgbColor }}>
                {roomData.mode === 'SPA' ? 'Modo Spa' : roomData.mode === 'MANANA' ? 'Modo Manana' : 'Modo Noche'}
              </span>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {modes.map((m) => {
            const isActive = roomData.mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleModeClick(m.id, m.cmd)}
                className={`py-2 px-2.5 rounded-lg border text-[10px] font-orbitron font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  isActive 
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
                style={{
                  borderColor: isActive ? m.hex : 'rgba(30, 41, 59, 0.5)',
                  boxShadow: isActive ? `0 0 10px ${m.hex}22` : 'none'
                }}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${m.color}`} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Cocina
  const renderCocina = () => {
    return (
      <div className="flex flex-col gap-4 mt-4">
        {/* Sensores */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="bg-slate-950/60 border border-slate-900 rounded-lg p-1.5 flex items-center justify-between">
            <span className="text-slate-500">TEMP:</span>
            <span className="text-orange-400 font-bold">{roomData.temp !== undefined ? `${roomData.temp.toFixed(1)}°C` : '24.0°C'}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-900 rounded-lg p-1.5 flex items-center justify-between">
            <span className="text-slate-500">HUM:</span>
            <span className="text-cyan-400 font-bold">{roomData.humidity !== undefined ? `${roomData.humidity.toFixed(1)}%` : '50.0%'}</span>
          </div>
          <div className={`border rounded-lg p-1.5 flex items-center justify-between ${roomData.gasAlert ? 'bg-red-950/30 border-red-500/30' : 'bg-slate-950/60 border-slate-900'}`}>
            <span className="text-slate-500">GAS:</span>
            <span className={`font-bold ${roomData.gasAlert ? 'text-red-400 animate-pulse' : 'text-yellow-500'}`}>{roomData.gasLevel || 120} ppm</span>
          </div>
          <div className={`border rounded-lg p-1.5 flex items-center justify-between ${roomData.fireAlert ? 'bg-red-950/40 border-red-500/40' : 'bg-slate-950/60 border-slate-900'}`}>
            <span className="text-slate-500">FUEGO:</span>
            <span className={`font-bold ${roomData.fireAlert ? 'text-red-500 animate-ping' : 'text-green-500'}`}>{roomData.fireAlert ? 'FUEGO!' : 'OK'}</span>
          </div>
        </div>

        {/* Alertas */}
        {(roomData.fireAlert || roomData.gasAlert) && (
          <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-1.5 text-[8px] text-red-400 font-mono flex items-center gap-1 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            <span>{roomData.fireAlert ? '¡PELIGRO: INCENDIO DETECTADO!' : '¡ADVERTENCIA: FUGA DE GAS!'}</span>
          </div>
        )}

        {/* Controles */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => triggerManualControl('cocina', 'nevera', !roomData.nevera, roomData.nevera ? 'off' : 'nevera')}
            className={`py-1.5 rounded-lg text-[9px] font-semibold transition-all ${
              roomData.nevera ? 'bg-blue-900/50 border border-blue-500/50 text-blue-300' : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            NEVERA: {roomData.nevera ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => triggerManualControl('cocina', 'lights', !roomData.lights, roomData.lights ? 'off' : 'cocina')}
            className={`py-1.5 rounded-lg text-[9px] font-semibold transition-all ${
              roomData.lights ? 'bg-green-900/50 border border-green-500/50 text-green-300' : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            LUZ: {roomData.lights ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => triggerManualControl('cocina', 'stove', !roomData.stove, roomData.stove ? 'off' : 'estufa')}
            className={`py-1.5 rounded-lg text-[9px] font-semibold transition-all ${
              roomData.stove ? 'bg-cyan-900/50 border border-cyan-500/50 text-cyan-300' : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            ESTUFA: {roomData.stove ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => {
              triggerManualControl('cocina', 'lights', false, 'off');
              triggerManualControl('cocina', 'stove', false, 'off');
              triggerManualControl('cocina', 'nevera', false, 'off');
            }}
            className="py-1.5 rounded-lg text-[9px] font-semibold bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            APAGAR TODO
          </button>
        </div>
      </div>
    );
  };

  // Render Habitación
  const renderHabitacion = () => {
    return (
      <div className="flex flex-col gap-4 mt-4">
        {/* OLED Display */}
        <div className="w-full h-16 bg-slate-950 border border-slate-800 rounded-xl p-2 flex flex-col justify-between font-mono relative overflow-hidden">
          <div className="text-[8px] text-cyan-400 font-bold border-b border-cyan-950 pb-0.5 flex justify-between">
            <span>NEXUS: CUARTO</span>
            <span>DHT11</span>
          </div>
          <div className="flex-1 flex justify-between items-center mt-1">
            <span className="text-xs text-white font-orbitron font-extrabold tracking-wider">{currentTime}</span>
            <div className="text-[8px] text-slate-400 text-right">
              <div>T: <span className="text-orange-400 font-bold">{roomData.temp !== undefined ? `${roomData.temp.toFixed(1)}°C` : '24.0°C'}</span></div>
              <div>H: <span className="text-cyan-400 font-bold">{roomData.humidity !== undefined ? `${roomData.humidity.toFixed(1)}%` : '50.0%'}</span></div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => triggerManualControl('habitacion', 'blinds', 100, 'ABRIR_PERSIANA')}
            className="flex-1 py-2 rounded-lg border border-slate-800 hover:border-cyber-blue bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-cyber-blue text-[9px] font-orbitron flex items-center justify-center gap-1 transition-all"
          >
            <ArrowUp className="w-3 h-3" />
            ABRIR PERSIANA
          </button>
          <button
            onClick={() => triggerManualControl('habitacion', 'blinds', 0, 'CERRAR_PERSIANA')}
            className="flex-1 py-2 rounded-lg border border-slate-800 hover:border-cyber-blue bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-cyber-blue text-[9px] font-orbitron flex items-center justify-center gap-1 transition-all"
          >
            <ArrowDown className="w-3 h-3" />
            CERRAR PERSIANA
          </button>
        </div>
      </div>
    );
  };

  // Render Garaje
  const renderGaraje = () => {
    const isOpen = roomData.door === 'OPEN';
    return (
      <div className="flex flex-col gap-4 mt-4">
        {/* Cámara YOLO (stream desde yolo_garage.py) */}
        <div className="w-full rounded-xl overflow-hidden border border-slate-800 bg-black relative aspect-video">
          {!camError ? (
            <img
              src={YOLO_CAM_URL}
              alt="Cámara YOLO"
              className="w-full h-full object-cover"
              onError={() => setCamError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-1 text-[10px] font-mono">
              <Camera className="w-5 h-5" />
              <span>Cámara YOLO offline</span>
              <span className="text-[8px] text-slate-700">ejecuta: py yolo_garage.py</span>
            </div>
          )}
          <div className="absolute top-1 left-2 text-[7px] font-orbitron tracking-widest text-cyan-400/80 uppercase bg-black/40 px-1 rounded">
            YOLO CAM
          </div>
        </div>

        {/* Radar Proximidad */}
        <div className="w-full h-12 bg-slate-900 border border-slate-950 rounded-xl relative flex items-center px-2 overflow-hidden">
          <div className="w-2.5 h-full bg-slate-950 border-r border-cyan-800 flex items-center justify-center">
            <div className="w-1 h-4 bg-cyber-blue animate-pulse rounded-full" />
          </div>
          <div className="absolute left-3 top-0 bottom-0 w-4 bg-red-500/10 border-r border-red-500/20" />
          
          <motion.div
            className="absolute h-5 w-10 bg-gradient-to-r from-blue-900 to-indigo-700 border border-cyan-500/30 rounded flex items-center justify-center text-[7px] font-bold text-cyan-200 shadow-md"
            animate={{ 
              left: `${Math.min(80, Math.max(12, ((roomData.distance || 15) / 30) * 100))}%`
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            CAR
          </motion.div>
          <div className="absolute top-1 right-2 text-[7px] text-slate-600 font-mono">{roomData.distance || 15} cm</div>
        </div>

        {/* Indicador de detección YOLO (cámara iPhone) — solo informativo */}
        <div className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 border text-[9px] font-orbitron tracking-wide ${
          yoloDetection?.detected
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : 'bg-slate-950/40 border-slate-800 text-slate-500'
        }`}>
          <span className="flex items-center gap-1.5">
            <Car className="w-3 h-3" />
            YOLO CÁMARA
          </span>
          <span className={yoloDetection?.detected ? 'animate-pulse font-bold' : ''}>
            {yoloDetection?.detected
              ? `CARRO DETECTADO ${yoloDetection.confidence ? `(${Math.round(yoloDetection.confidence * 100)}%)` : ''}`
              : 'SIN CARRO'}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => triggerManualControl('garaje', 'door', 'OPEN', 'ABRIR')}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-orbitron font-semibold transition-all ${
              isOpen ? 'bg-green-900/50 border border-green-500/50 text-green-300' : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            ABRIR PORTÓN
          </button>
          <button
            onClick={() => triggerManualControl('garaje', 'door', 'CLOSED', 'CERRAR')}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-orbitron font-semibold transition-all ${
              !isOpen ? 'bg-red-900/50 border border-red-500/50 text-red-300' : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            CERRAR PORTÓN
          </button>
        </div>
      </div>
    );
  };

  const getMeta = () => {
    switch (roomKey) {
      case 'bano':
        return { title: 'Baño Inteligente', desc: 'LED RGB & OLED', render: renderBano };
      case 'cocina':
        return { title: 'Cocina Inteligente', desc: 'Sensores en Vivo & Control', render: renderCocina };
      case 'habitacion':
        return { title: 'Habitación', desc: 'Reloj, Persiana & Clima', render: renderHabitacion };
      case 'garaje':
        return { title: 'Garaje Inteligente', desc: 'Servo Portón & Radar', render: renderGaraje };
      default:
        return { title: '', desc: '', render: () => null };
    }
  };

  const meta = getMeta();

  return (
    <div 
      className="glass-panel rounded-2xl p-4 flex flex-col justify-between border relative overflow-hidden transition-all duration-300 hover:shadow-glow/10"
      style={{
        boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.3)`
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between z-10 border-b border-slate-900 pb-2">
        <div className="flex flex-col">
          <h4 className="font-orbitron font-semibold text-xs text-slate-100 tracking-wider">
            {meta.title}
          </h4>
          <span className="text-[8px] text-slate-500 font-sans mt-0.5">{meta.desc}</span>
        </div>
        <span className="text-[7px] font-orbitron tracking-widest text-slate-600 uppercase">SYS ACTIVE</span>
      </div>

      {/* Body & Controls */}
      <div className="z-10 flex-1 flex flex-col justify-between">
        {meta.render()}
      </div>

      {/* Sci-fi decoration */}
      <div className="absolute right-0 bottom-0 w-2.5 h-2.5 border-r border-b border-cyber-blue/10 pointer-events-none" />
    </div>
  );
}
