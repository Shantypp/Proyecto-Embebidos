import React, { useState, useEffect, useRef } from 'react';
import { useSmartHome } from '../context/SmartHomeContext';
import { Terminal, Database, ShieldAlert, Cpu } from 'lucide-react';

export default function LogsPanel() {
  const { logs, serialTraffic } = useSmartHome();
  const [activeTab, setActiveTab] = useState('system'); // 'system' o 'serial'
  const scrollContainerRef = useRef(null);

  // Auto-scroll al final SOLO dentro del terminal de logs.
  // (Antes se usaba scrollIntoView, que arrastraba toda la ventana hacia abajo
  //  cada vez que llegaba un log nuevo, impidiendo scrollear la página hacia arriba.)
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs, serialTraffic, activeTab]);

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col h-[400px] overflow-hidden relative">
      <div className="absolute inset-0 scanlines opacity-5 pointer-events-none" />
      
      {/* Cabecera */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <h3 className="font-orbitron font-semibold text-sm tracking-wider text-neon-blue flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          Terminal de Logs
        </h3>
        
        {/* Pestañas */}
        <div className="flex gap-1.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1 rounded-md text-[9px] font-orbitron tracking-wider uppercase transition-all ${
              activeTab === 'system'
                ? 'bg-slate-900 text-cyber-blue border-b border-cyber-blue/50'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Sistemas
          </button>
          <button
            onClick={() => setActiveTab('serial')}
            className={`px-3 py-1 rounded-md text-[9px] font-orbitron tracking-wider uppercase transition-all ${
              activeTab === 'serial'
                ? 'bg-slate-900 text-cyber-purple border-b border-cyber-purple/50'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Serial Bus
          </button>
        </div>
      </div>

      {/* Contenedor del Terminal */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-slate-950/80 border border-slate-900/60 rounded-xl p-4 font-mono text-[10px] flex flex-col gap-2 relative">
        {activeTab === 'system' ? (
          // LOGS DE COMANDOS / SISTEMA
          logs.length > 0 ? (
            logs.map((log) => {
              const dateStr = new Date(log.timestamp).toLocaleTimeString();
              
              if (log.intent === 'LOG') {
                return (
                  <div key={log.id} className="text-slate-400">
                    <span className="text-slate-600">[{dateStr}]</span>{' '}
                    <span className="text-cyber-blue font-bold">[{log.module}]</span> {log.command}
                  </div>
                );
              }

              const isSuccess = log.status === 'success';
              const isUnknown = log.intent === 'UNKNOWN';

              return (
                <div key={log.id} className="border-b border-slate-900/40 pb-1 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600">[{dateStr}]</span>
                    {isUnknown ? (
                      <span className="text-cyber-red font-bold flex items-center gap-0.5">
                        <ShieldAlert className="w-2.5 h-2.5" /> REJECT
                      </span>
                    ) : (
                      <span className="text-cyber-green font-bold">OK</span>
                    )}
                    <span className="text-slate-400">Voz: &ldquo;{log.command}&rdquo;</span>
                  </div>
                  {!isUnknown && (
                    <div className="text-slate-500 pl-4">
                      Intención: <span className="text-cyber-blue">{log.intent}</span> | Módulo:{' '}
                      <span className="text-cyber-purple">{log.module}</span> | Tx:{' '}
                      <span className="text-amber-400 font-bold">{log.response}</span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
              <Database className="w-6 h-6 stroke-1" />
              <span>Esperando señales de comandos...</span>
            </div>
          )
        ) : (
          // LOGS DE TRÁFICO SERIAL BRUTO
          serialTraffic.length > 0 ? (
            serialTraffic.map((traffic) => {
              const dateStr = new Date(traffic.timestamp).toLocaleTimeString();
              const isTx = traffic.type === 'tx';
              const roleName = traffic.role.toUpperCase();

              return (
                <div key={traffic.id} className="flex items-center gap-1.5">
                  <span className="text-slate-600">[{dateStr}]</span>
                  <span className="text-slate-500">[{roleName}]</span>
                  {isTx ? (
                    <span className="text-amber-400 font-bold">TX &gt;&gt;</span>
                  ) : (
                    <span className="text-cyber-green font-bold">RX &lt;&lt;</span>
                  )}
                  <span className={isTx ? 'text-slate-200' : 'text-cyber-green font-medium'}>
                    {traffic.data}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
              <Cpu className="w-6 h-6 stroke-1 animate-pulse" />
              <span>Monitoreando canal serial de hardware...</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
