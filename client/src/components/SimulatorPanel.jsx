import React from 'react';
import { useSmartHome } from '../context/SmartHomeContext';
import { motion } from 'framer-motion';
import { Car as CarIcon, Radio, ShieldAlert, Clock, Milestone, LogIn, ArrowRight, Thermometer, Droplets, Flame, AlertTriangle, Wind } from 'lucide-react';

export default function SimulatorPanel() {
  const { homeState, triggerSensorSimulation, garageAccessLogs, serialMode } = useSmartHome();
  
  const distance = homeState.garaje.distance;
  const doorState = homeState.garaje.door;
  const isAutoCloseActive = homeState.garaje.autoCloseActive;
  const isOpen = doorState === 'OPEN';

  const handleDistanceChange = (e) => {
    const value = parseInt(e.target.value);
    triggerSensorSimulation('distance', value);
  };

  // Convertir distancia en porcentaje para el posicionamiento del coche (30cm máx)
  const carPositionPercent = Math.min(90, Math.max(12, (distance / 30) * 100));

  return (
    <div className="flex flex-col gap-6">
      
      {/* PANEL DEL RADAR DEL GARAJE */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden">
        {/* Grid de fondo decorativo */}
        <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />

        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 z-10">
          <h3 className="font-orbitron font-semibold text-xs tracking-wider text-neon-blue flex items-center gap-2">
            <Radio className={`w-4 h-4 text-cyber-blue ${distance < 5 ? 'animate-ping' : 'animate-pulse'}`} />
            Radar de Proximidad Garaje
          </h3>
          <span className={`text-[8px] font-orbitron px-2 py-0.5 rounded border ${
            isOpen 
              ? 'text-cyber-green border-cyber-green/20 bg-cyber-green/5' 
              : 'text-cyber-red border-cyber-red/20 bg-cyber-red/5'
          }`}>
            PORTÓN: {isOpen ? 'ABIERTO (90°)' : 'CERRADO (0°)'}
          </span>
        </div>

        {/* Pista Visual en Tiempo Real */}
        <div className="w-full h-24 bg-slate-950 border border-slate-900 rounded-xl relative flex items-center p-4 z-10 overflow-hidden select-none">
          
          {/* Portón Físico (Servo) a la izquierda */}
          <div className="absolute left-4 top-4 bottom-4 w-2 flex flex-col items-center justify-between">
            <div className="w-1.5 h-1/3 bg-slate-800 rounded" />
            
            {/* Hoja del portón que pivota */}
            <motion.div 
              className={`w-1.5 h-1/2 rounded ${
                isOpen ? 'bg-cyber-green shadow-glowGreen' : 'bg-cyber-red shadow-glowRed'
              }`}
              animate={{ rotate: isOpen ? -90 : 0 }}
              style={{ transformOrigin: 'top center' }}
              transition={{ duration: 0.5 }}
            />
            
            <div className="w-1.5 h-1/3 bg-slate-800 rounded" />
          </div>

          {/* Ondas del Radar (Beams) */}
          <div className="absolute left-6 top-0 bottom-0 w-24 flex items-center justify-start overflow-hidden pointer-events-none">
            {distance > 0 && (
              <>
                <div 
                  className={`w-6 h-6 border-r-2 border-t-2 border-b-2 rounded-full absolute opacity-30 ${
                    distance < 5 ? 'border-cyber-red animate-ping' : 'border-cyber-blue animate-pulse'
                  }`}
                  style={{ animationDuration: '1.2s' }}
                />
                <div 
                  className={`w-12 h-12 border-r-2 border-t-2 border-b-2 rounded-full absolute opacity-20 ${
                    distance < 5 ? 'border-cyber-red animate-ping' : 'border-cyber-blue animate-pulse'
                  }`}
                  style={{ animationDuration: '1.6s', animationDelay: '0.3s' }}
                />
                <div 
                  className={`w-20 h-20 border-r-2 border-t-2 border-b-2 rounded-full absolute opacity-10 ${
                    distance < 5 ? 'border-cyber-red animate-ping' : 'border-cyber-blue animate-pulse'
                  }`}
                  style={{ animationDuration: '2s', animationDelay: '0.6s' }}
                />
              </>
            )}
          </div>

          {/* Coche en Tiempo Real */}
          <motion.div
            className={`absolute h-10 w-16 bg-gradient-to-r ${
              distance < 5 
                ? 'from-red-950 to-red-800 border-cyber-red shadow-glowRed/20' 
                : 'from-slate-900 to-cyan-950 border-cyber-blue/30 shadow-glow/10'
            } border rounded-xl flex flex-col items-center justify-center text-[8px] font-bold text-slate-300 shadow-md`}
            animate={{ left: `${carPositionPercent}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 18 }}
          >
            <CarIcon className={`w-4 h-4 ${distance < 5 ? 'text-cyber-red animate-bounce' : 'text-cyber-blue'}`} />
            <span className="font-mono text-[7px] mt-0.5">VEHÍCULO</span>
          </motion.div>

          {/* Advertencia de colisión */}
          {distance < 5 && (
            <div className="absolute inset-0 bg-red-950/20 pointer-events-none flex items-center justify-center border border-red-500/20 rounded-xl">
              <span className="text-[9px] font-orbitron font-bold text-cyber-red animate-pulse tracking-widest uppercase">
                &iexcl; PELIGRO DE IMPACTO !
              </span>
            </div>
          )}

          {/* Marcadores de límites */}
          <div className="absolute bottom-1.5 left-7 text-[7px] text-slate-500">Puerta</div>
          <div className="absolute bottom-1.5 right-3 text-[7px] text-slate-600">30 cm</div>
        </div>

        {/* Métrica de Distancia del Sensor */}
        <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-xl border border-slate-900/60 z-10">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-mono text-slate-500">LECTURA HC-SR04:</span>
            <span className="text-[10px] font-orbitron font-semibold text-slate-300">
              Sensor Proximidad
            </span>
          </div>
          <span className={`text-xl font-orbitron font-black ${
            distance < 5 ? 'text-cyber-red animate-pulse text-neon-red' : 'text-cyber-blue text-neon-blue'
          }`}>
            {distance} cm
          </span>
        </div>

        {/* Deslizador del Simulador Manual (si no hay hardware) */}
        <div className="flex flex-col gap-1.5 bg-slate-950/40 border border-slate-900/60 p-3 rounded-xl z-10">
          <div className="flex justify-between text-[8px] text-slate-500 font-orbitron tracking-widest uppercase">
            <span>Simulador de Distancia</span>
            <span>{serialMode === 'server' ? 'Modo Servidor' : 'Modo Web Serial'}</span>
          </div>
          <input
            type="range"
            min="2"
            max="30"
            value={distance}
            onChange={handleDistanceChange}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyber-blue focus:outline-none"
          />
          <span className="text-[8px] text-slate-600 leading-normal text-center italic mt-0.5">
            *Desliza para simular acercar el coche al radar del garaje.
          </span>
        </div>

        {/* Notificación de Regla de Auto-Cierre */}
        {distance < 5 && (
          <div className="p-2.5 rounded-xl bg-red-950/15 border border-red-500/25 flex items-center gap-2 text-cyber-red text-[9px] z-10">
            <ShieldAlert className="w-4 h-4 text-cyber-red shrink-0 animate-ping" />
            <div className="flex flex-col">
              <span className="font-orbitron font-bold uppercase">Auto-Cierre Activado</span>
              <span className="text-slate-500 font-mono text-[8px] mt-0.5">Servo D9 movido a 0 grados.</span>
            </div>
          </div>
        )}
      </div>

      {/* PANEL SIMULADOR COCINA Y HABITACIÓN */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />

        <div className="flex items-center justify-between border-b border-slate-800 pb-3 z-10">
          <h3 className="font-orbitron font-semibold text-xs tracking-wider text-neon-blue flex items-center gap-2">
            <Wind className="w-4 h-4 text-cyber-blue" />
            Simulador de Sensores Cocina/Habitación
          </h3>
          <span className="text-[8px] font-orbitron text-slate-500 uppercase tracking-widest font-mono">
            Modo Simulación
          </span>
        </div>

        {/* 1. Deslizador de Temperatura (DHT11) */}
        <div className="flex flex-col gap-1.5 bg-slate-950/40 border border-slate-900/60 p-3 rounded-xl z-10">
          <div className="flex justify-between text-[9px] text-slate-400 font-mono">
            <span className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5 text-orange-500" /> Temperatura</span>
            <span className="font-bold text-slate-200">{homeState.cocina.temp || 24}°C</span>
          </div>
          <input
            type="range"
            min="10"
            max="45"
            value={homeState.cocina.temp || 24}
            onChange={(e) => triggerSensorSimulation('temp', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none"
          />
        </div>

        {/* 2. Deslizador de Humedad (DHT11) */}
        <div className="flex flex-col gap-1.5 bg-slate-950/40 border border-slate-900/60 p-3 rounded-xl z-10">
          <div className="flex justify-between text-[9px] text-slate-400 font-mono">
            <span className="flex items-center gap-1"><Droplets className="w-3.5 h-3.5 text-cyan-500" /> Humedad</span>
            <span className="font-bold text-slate-200">{homeState.cocina.humidity || 50}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="95"
            value={homeState.cocina.humidity || 50}
            onChange={(e) => triggerSensorSimulation('humidity', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
          />
        </div>

        {/* 3. Deslizador de Nivel de Gas (MQ) */}
        <div className="flex flex-col gap-1.5 bg-slate-950/40 border border-slate-900/60 p-3 rounded-xl z-10">
          <div className="flex justify-between text-[9px] text-slate-400 font-mono">
            <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-yellow-500" /> Nivel de Gas MQ</span>
            <span className={`font-bold ${homeState.cocina.gasAlert ? 'text-cyber-red animate-pulse' : 'text-slate-200'}`}>
              {homeState.cocina.gasLevel || 120} ppm
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="800"
            value={homeState.cocina.gasLevel || 120}
            onChange={(e) => triggerSensorSimulation('gas', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-500 focus:outline-none"
          />
        </div>

        {/* 4. Sensor de Fuego Toggle */}
        <div className="flex items-center justify-between bg-slate-950/40 border border-slate-900/60 p-3 rounded-xl z-10">
          <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-red-500" /> Sensor de Fuego:
          </span>
          <button
            onClick={() => triggerSensorSimulation('fire', homeState.cocina.fireAlert ? 0 : 1)}
            className={`py-1 px-3 rounded-lg text-[9px] font-orbitron font-bold tracking-wider transition-all ${
              homeState.cocina.fireAlert
                ? 'bg-red-950/40 border border-red-500/30 text-cyber-red shadow-glowRed/10 animate-pulse'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {homeState.cocina.fireAlert ? '¡FUEGO DETECTADO!' : 'ESTADO SEGURO'}
          </button>
        </div>
      </div>

      {/* DASHBOARD DE HISTORIAL DE ACCESOS */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3.5 relative overflow-hidden">
        <div className="absolute inset-0 scanlines opacity-5 pointer-events-none" />
        
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-orbitron font-semibold text-xs tracking-wider text-neon-blue flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyber-purple" />
            Historial de Accesos
          </h3>
          <span className="text-[8px] font-orbitron text-slate-500 uppercase tracking-widest font-mono">
            Últimos registros
          </span>
        </div>

        {/* Listado de Logs */}
        <div className="flex flex-col gap-1.5 font-mono text-[9px] max-h-48 overflow-y-auto">
          {garageAccessLogs && garageAccessLogs.length > 0 ? (
            garageAccessLogs.slice(0, 6).map((log) => {
              const dateStr = new Date(log.timestamp).toLocaleTimeString();
              const isClosed = log.action === 'CLOSED';
              return (
                <div key={log.id} className="flex justify-between items-center border-b border-slate-900/40 pb-1.5 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600">[{dateStr}]</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded text-[8px] tracking-wide ${
                      isClosed 
                        ? 'bg-red-950/20 text-cyber-red border border-red-500/15' 
                        : 'bg-green-950/20 text-cyber-green border border-green-500/15'
                    }`}>
                      {isClosed ? 'CERRÓ' : 'ABRIÓ'}
                    </span>
                  </div>
                  <span className="text-slate-400">
                    Dist: <span className="text-cyber-blue font-bold">{log.distance}cm</span>
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-center text-slate-600 py-6 flex flex-col items-center gap-1.5">
              <Milestone className="w-5 h-5 stroke-1" />
              <span>Sin registros de apertura/cierre recientes en el portón.</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
