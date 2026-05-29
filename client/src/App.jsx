import React, { useState, useEffect } from 'react';
import { useSmartHome } from './context/SmartHomeContext';
import { useSpeech } from './hooks/useSpeech';
import ConnectionPanel from './components/ConnectionPanel';

import Assistant from './components/Assistant';
import AudioVisualizer from './components/AudioVisualizer';
import RoomCard from './components/RoomCard';
import LogsPanel from './components/LogsPanel';
import { Cpu, Power, Zap, Activity } from 'lucide-react';

export default function App() {
  const { 
    homeState, 
    triggerVoiceCommand, 
    serialMode,
    isServerConnected,
    serverSerialStatus,
    localSerialPorts 
  } = useSmartHome();

  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString());

  // Conectar reconocedor de voz al enrutador serial
  const {
    isListening,
    transcript,
    interimTranscript,
    assistantState,
    assistantReply,
    startListening,
    stopListening
  } = useSpeech(triggerVoiceCommand);

  // Reloj del sistema
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleListen = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Calcular estadísticas rápidas del hogar
  const countDevicesOn = () => {
    let count = 0;
    if (homeState.bano.state === 'ON') count++;
    if (homeState.cocina.lights) count++;
    if (homeState.cocina.stove) count++;
    if (homeState.cocina.fan) count++;
    if (homeState.sala.tv) count++;
    if (homeState.sala.piano) count++;
    if (homeState.sala.game) count++;
    if (homeState.habitacion.lights) count++;
    if (homeState.garaje.door === 'OPEN') count++;
    return count;
  };

  const getConnectedPortsCount = () => {
    if (serialMode === 'server') {
      return Object.values(serverSerialStatus).filter(s => s.status === 'CONNECTED').length;
    } else {
      return Object.values(localSerialPorts).filter(s => s.status === 'CONNECTED').length;
    }
  };

  return (
    <div className="min-h-screen relative p-4 md:p-6 flex flex-col gap-6 text-slate-100">
      {/* Grid decorativo principal */}
      <div className="absolute inset-0 cyber-grid opacity-15 pointer-events-none z-0" />

      {/* HEADER DE CONTROL */}
      <header className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-glow/30">
            <Cpu className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <h1 className="font-orbitron font-extrabold text-base md:text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300">
              NEXUS HOME CONTROLLER
            </h1>
            <span className="text-[9px] font-orbitron text-slate-400 tracking-widest uppercase">
              Control Full Stack por Voz & Puerto Serial
            </span>
          </div>
        </div>

        {/* Módulos de Estado Rápido */}
        <div className="flex flex-wrap items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2 bg-slate-950/60 py-1.5 px-3 rounded-xl border border-slate-900 font-mono text-xs">
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-slate-500">CONSUMO:</span>
            <span className="text-amber-400 font-bold">{countDevicesOn() * 45 + 120} W</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-950/60 py-1.5 px-3 rounded-xl border border-slate-900 font-mono text-xs">
            <Activity className="w-3.5 h-3.5 text-cyber-blue" />
            <span className="text-slate-500">DISPOSITIVOS:</span>
            <span className="text-cyber-blue font-bold">{countDevicesOn()} ENCENDIDOS</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-950/60 py-1.5 px-3 rounded-xl border border-slate-900 font-mono text-xs">
            <Cpu className="w-3.5 h-3.5 text-cyber-green" />
            <span className="text-slate-500">COM PUERTOS:</span>
            <span className="text-cyber-green font-bold">{getConnectedPortsCount()}</span>
          </div>
          <div className="hidden lg:block text-right font-orbitron text-xs tracking-wider text-slate-400">
            {systemTime}
          </div>
        </div>
      </header>

      {/* CUERPO DEL DASHBOARD (DISEÑO 3 COLUMNAS) */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 z-10">
        
        {/* COLUMNA 1: CONFIGURACIÓN DE PUERTOS */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <ConnectionPanel />
        </div>

        {/* COLUMNA 2 & 3: CONTROL CENTRAL / HABITACIONES */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Asistente virtual y visualizador de onda */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Assistant
                isListening={isListening}
                assistantState={assistantState}
                assistantReply={assistantReply}
                transcript={transcript}
                interimTranscript={interimTranscript}
                onToggleListen={handleToggleListen}
              />
            </div>
            <div className="flex flex-col justify-between gap-6 md:col-span-1">
              <div className="glass-panel rounded-2xl p-5 flex flex-col justify-center items-center flex-1 min-h-[150px]">
                <span className="text-[10px] font-orbitron text-slate-500 tracking-wider uppercase mb-3">
                  Visualizador de Onda de Voz
                </span>
                <AudioVisualizer isListening={isListening} assistantState={assistantState} />
              </div>
              <div className="glass-panel rounded-2xl p-5 flex flex-col justify-center flex-1 bg-gradient-to-tr from-cyan-950/15 to-transparent">
                <span className="text-[9px] font-orbitron text-cyber-blue uppercase tracking-widest font-bold mb-1">
                  Comandos de ejemplo:
                </span>
                <ul className="text-[10px] text-slate-400 space-y-1 font-mono list-disc list-inside">
                  <li>&ldquo;activar modo spa&rdquo;</li>
                  <li>&ldquo;encender cocina&rdquo;</li>
                  <li>&ldquo;abrir garaje&rdquo;</li>
                  <li>&ldquo;subir persiana&rdquo;</li>
                  <li>&ldquo;encender tv&rdquo;</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Cuadrícula de Habitaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <RoomCard roomKey="bano" />
            <RoomCard roomKey="cocina" />
            <RoomCard roomKey="habitacion" />
            <RoomCard roomKey="garaje" />
          </div>
        </div>

        {/* COLUMNA 4: LOGS Y TRÁFICO SERIAL */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <LogsPanel />
          
          {/* Card informativa de Conexiones Físicas */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3">
            <h4 className="font-orbitron font-semibold text-xs text-cyber-blue tracking-wider uppercase">
              Esquema de Conexión Física
            </h4>
            <div className="flex flex-col gap-2.5 text-[10px] text-slate-400 font-mono">
              <div className="flex flex-col border-b border-slate-900 pb-1.5">
                <span className="text-slate-300 font-bold">ARDUINO 1 (COM 5):</span>
                <span>Módulos: Baño + Garaje</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-300 font-bold">ARDUINO 2 (COM Y):</span>
                <span>Módulos: Cocina + Habitación</span>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
