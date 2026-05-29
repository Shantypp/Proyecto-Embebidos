import React, { useEffect, useState } from 'react';
import { useSmartHome } from '../context/SmartHomeContext';
import { ToggleLeft, ToggleRight, RefreshCw, Cpu, Server, Wifi, WifiOff, Link, Unlink } from 'lucide-react';

export default function ConnectionPanel() {
  const {
    serialMode,
    setSerialMode,
    isServerConnected,
    serverSerialStatus,
    localSerialPorts,
    serverPorts,
    scanServerPorts,
    connectServerSerial,
    disconnectServerSerial,
    isWebSerialSupported,
    connectLocalPort,
    disconnectLocalPort
  } = useSmartHome();

  const [selectedPorts, setSelectedPorts] = useState({
    arduino1: '',
    arduino2: '',
    arduino3: ''
  });

  // Escanear puertos del servidor al montar el componente
  useEffect(() => {
    if (serialMode === 'server' && isServerConnected) {
      scanServerPorts();
    }
  }, [serialMode, isServerConnected]);

  const handlePortSelect = (role, path) => {
    setSelectedPorts(prev => ({ ...prev, [role]: path }));
  };

  const handleConnectServer = (role) => {
    let path = selectedPorts[role];
    
    // Fallback por si el navegador autocompletó el select pero no disparó el estado de React
    if (!path) {
      const selectEl = document.getElementById(`select-${role}`);
      if (selectEl && selectEl.value) {
        path = selectEl.value;
        handlePortSelect(role, path); // Sincronizar estado de React
      }
    }

    if (!path) {
      alert('Por favor selecciona un puerto COM primero.');
      return;
    }
    connectServerSerial(role, path);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONNECTED':
        return 'bg-cyber-green text-cyber-green border-cyber-green/40 shadow-glowGreen/20';
      case 'CONNECTING':
        return 'bg-cyber-orange text-cyber-orange border-cyber-orange/40 animate-pulse';
      case 'ERROR':
        return 'bg-cyber-red text-cyber-red border-cyber-red/40 shadow-glowRed/20';
      case 'DISCONNECTED':
      default:
        return 'bg-slate-700 text-slate-500 border-slate-700/50';
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col gap-5">
      {/* Cabecera */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="font-orbitron font-semibold text-sm tracking-wider text-neon-blue flex items-center gap-2">
          <SettingsPanelIcon className="w-4 h-4" />
          Hardware Conector
        </h3>
        {/* Toggle Modo Serial */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setSerialMode('server')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-orbitron tracking-wider transition-all ${
              serialMode === 'server'
                ? 'bg-cyan-950/50 border border-cyber-blue/30 text-cyber-blue shadow-glow/10'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Servidor COM
          </button>
          <button
            onClick={() => setSerialMode('local')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-orbitron tracking-wider transition-all ${
              serialMode === 'local'
                ? 'bg-cyan-950/50 border border-cyber-blue/30 text-cyber-blue shadow-glow/10'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Web Serial API
          </button>
        </div>
      </div>

      {/* DETALLES MODO CENTRALIZADO (SOCKET.IO) */}
      {serialMode === 'server' && (
        <div className="flex flex-col gap-4">
          {/* Status del Backend */}
          <div className="flex items-center justify-between bg-slate-900/40 p-3 rounded-xl border border-slate-800/40">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium">Servidor Node.js</span>
                <span className="text-[9px] text-slate-500 font-mono">localhost:5000</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {isServerConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-cyber-green" />
                  <span className="text-[9px] font-orbitron text-cyber-green uppercase">ONLINE</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-cyber-red" />
                  <span className="text-[9px] font-orbitron text-cyber-red uppercase">OFFLINE</span>
                </>
              )}
            </div>
          </div>

          {/* Listado de Arduinos y Asignación COM */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-orbitron tracking-widest text-slate-400 uppercase">
                Asignación de Puertos COM
              </span>
              <button
                disabled={!isServerConnected}
                onClick={scanServerPorts}
                className="p-1 rounded-lg border border-slate-800 hover:border-slate-600 bg-slate-900/60 disabled:opacity-40 text-slate-400 hover:text-slate-200 transition-all"
                title="Escanear Puertos"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* Arduino 1, 2, 3 */}
            {['arduino1', 'arduino2', 'arduino3'].map((role, idx) => {
              const info = getArduinoRoleInfo(role);
              const statusObj = serverSerialStatus[role] || { status: 'DISCONNECTED', path: null };
              const isConnected = statusObj.status === 'CONNECTED';

              return (
                <div key={role} className="flex flex-col gap-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300">
                      Arduino {idx + 1} <span className="text-[9px] text-slate-500 font-normal">({info.modules})</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full led-indicator ${isConnected ? 'led-on' : 'led-off'}`} />
                      <span className="text-[8px] font-mono text-slate-500 uppercase">{statusObj.status}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <select
                      id={`select-${role}`}
                      disabled={isConnected || !isServerConnected}
                      value={selectedPorts[role] || statusObj.path || ''}
                      onChange={(e) => handlePortSelect(role, e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-[10px] text-slate-300 focus:outline-none focus:border-cyber-blue disabled:opacity-50"
                    >
                      <option value="">Seleccionar puerto...</option>
                      {serverPorts.map(p => (
                        <option key={p.path} value={p.path}>
                          {p.path} ({p.manufacturer || 'Desconocido'})
                        </option>
                      ))}
                    </select>

                    {isConnected ? (
                      <button
                        onClick={() => disconnectServerSerial(role)}
                        className="py-1 px-2.5 rounded-lg border border-red-500/30 hover:bg-red-950/20 text-cyber-red text-[10px] font-orbitron transition-all flex items-center gap-1"
                      >
                        <Unlink className="w-3 h-3" />
                        Apagar
                      </button>
                    ) : (
                      <button
                        disabled={!isServerConnected}
                        onClick={() => handleConnectServer(role)}
                        className="py-1 px-2.5 rounded-lg border border-cyan-500/30 hover:bg-cyan-950/20 text-cyber-blue text-[10px] font-orbitron transition-all disabled:opacity-40 flex items-center gap-1"
                      >
                        <Link className="w-3 h-3" />
                        Conectar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DETALLES MODO NAVEGADOR DIRECTO (WEB SERIAL API) */}
      {serialMode === 'local' && (
        <div className="flex flex-col gap-4">
          {/* Soporte de Web Serial API */}
          <div className="flex items-center justify-between bg-slate-900/40 p-3 rounded-xl border border-slate-800/40">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium">Web Serial API</span>
                <span className="text-[9px] text-slate-500 font-mono">Control directo navegador</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isWebSerialSupported() ? (
                <span className="text-[9px] font-orbitron text-cyber-green border border-cyber-green/20 px-2 py-0.5 rounded bg-cyber-green/5">
                  SOPORTADO
                </span>
              ) : (
                <span className="text-[9px] font-orbitron text-cyber-red border border-cyber-red/20 px-2 py-0.5 rounded bg-cyber-red/5">
                  NO SOPORTADO
                </span>
              )}
            </div>
          </div>

          {/* Listado de Arduinos Web Serial */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-orbitron tracking-widest text-slate-400 uppercase">
              Asociación USB de Navegador
            </span>

            {['arduino1', 'arduino2', 'arduino3'].map((role, idx) => {
              const info = getArduinoRoleInfo(role);
              const conn = localSerialPorts[role] || { status: 'DISCONNECTED' };
              const isConnected = conn.status === 'CONNECTED';

              return (
                <div key={role} className="flex flex-col gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-slate-300">
                        Arduino {idx + 1}
                      </span>
                      <span className="text-[9px] text-slate-500">{info.modules}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full led-indicator ${isConnected ? 'led-on' : 'led-off'}`} />
                      <span className="text-[8px] font-mono text-slate-500 uppercase">{conn.status}</span>
                    </div>
                  </div>

                  <div className="flex justify-end mt-1">
                    {isConnected ? (
                      <button
                        onClick={() => disconnectLocalPort(role)}
                        className="w-full py-1.5 px-3 rounded-lg border border-red-500/30 hover:bg-red-950/20 text-cyber-red text-[10px] font-orbitron transition-all flex items-center justify-center gap-1"
                      >
                        <Unlink className="w-3 h-3" />
                        Desvincular Puerto USB
                      </button>
                    ) : (
                      <button
                        disabled={!isWebSerialSupported()}
                        onClick={() => connectLocalPort(role)}
                        className="w-full py-1.5 px-3 rounded-lg border border-cyan-500/30 hover:bg-cyan-950/20 text-cyber-blue text-[10px] font-orbitron transition-all disabled:opacity-40 flex items-center justify-center gap-1"
                      >
                        <Link className="w-3 h-3" />
                        Vincular Puerto USB
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Icono decorativo de settings
function SettingsPanelIcon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.936 6.936 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.645-.869l.214-1.28z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

const getArduinoRoleInfo = (role) => {
  const info = {
    arduino1: { modules: 'Baño + Garaje' },
    arduino2: { modules: 'Cocina + Habitación' },
    arduino3: { modules: 'Sala / Futuro' }
  };
  return info[role] || { modules: '' };
};
