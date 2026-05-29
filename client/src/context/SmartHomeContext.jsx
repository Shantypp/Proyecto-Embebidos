import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SmartHomeContext = createContext();

export const useSmartHome = () => useContext(SmartHomeContext);

export const SmartHomeProvider = ({ children }) => {
  // --- ESTADO DE DISPOSITIVOS ---
  const [homeState, setHomeState] = useState({
    bano: { rgbColor: '#00f0ff', mode: 'MANANA', state: 'ON' },
    cocina: { lights: false, stove: false, nevera: false, gasLevel: 120, gasAlert: false, fireAlert: false, temp: 24, humidity: 50 },
    sala: { tv: false, piano: false, game: false, gameScore: 0 },
    habitacion: { lights: false, blinds: 0, temp: 24, humidity: 50 }, // 100 = Abierta, 0 = Cerrada
    garaje: { door: 'CLOSED', distance: 15, autoCloseActive: false }
  });

  // --- LOGS Y TRAFICO SERIAL ---
  const [logs, setLogs] = useState([]);
  const [garageAccessLogs, setGarageAccessLogs] = useState([]);
  const [serialTraffic, setSerialTraffic] = useState([]);
  const [serverPorts, setServerPorts] = useState([]);

  // --- DETECCIÓN YOLO (cámara iPhone) — solo informativo, no controla el garaje ---
  const [yoloDetection, setYoloDetection] = useState({ detected: false, confidence: 0 });

  // --- MODOS DE CONEXIÓN ---
  // 'server' (Node.js serialport + Socket.IO) o 'local' (Web Serial API directa)
  const [serialMode, setSerialMode] = useState('server'); 
  const [isServerConnected, setIsServerConnected] = useState(false);
  const [serverSerialStatus, setServerSerialStatus] = useState({
    arduino1: { status: 'DISCONNECTED', path: null },
    arduino2: { status: 'DISCONNECTED', path: null },
    arduino3: { status: 'DISCONNECTED', path: null }
  });

  // --- ESTADO WEB SERIAL LOCAL ---
  const [localSerialPorts, setLocalSerialPorts] = useState({
    arduino1: { port: null, writer: null, reader: null, status: 'DISCONNECTED' },
    arduino2: { port: null, writer: null, reader: null, status: 'DISCONNECTED' },
    arduino3: { port: null, writer: null, reader: null, status: 'DISCONNECTED' }
  });

  const socketRef = useRef(null);
  const localReadersRef = useRef({ arduino1: null, arduino2: null, arduino3: null });

  // --- 1. CONFIGURACIÓN SOCKET.IO (BACKEND) ---
  useEffect(() => {
    // Conectar al servidor Node.js
    const socket = io('http://localhost:5000', {
      transports: ['websocket'],
      autoConnect: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsServerConnected(true);
      addSystemLog('SERVER', 'Conectado al servidor central Node.js');
    });

    socket.on('disconnect', () => {
      setIsServerConnected(false);
      addSystemLog('SERVER', 'Desconectado del servidor central');
    });

    // Actualización del estado de la casa
    socket.on('home_state_update', (newState) => {
      setHomeState(newState);
    });

    // Actualización del estado de puertos seriales del servidor
    socket.on('serial_connections_status', (status) => {
      setServerSerialStatus(status);
    });

    // Historial de comandos
    socket.on('logs_history', (history) => {
      setLogs(history);
    });

    // Historial de accesos garaje
    socket.on('garage_logs_update', (garageLogs) => {
      setGarageAccessLogs(garageLogs);
    });

    // Logs emitidos por el servidor
    socket.on('system_log', (data) => {
      addSystemLog(data.source, data.message);
    });

    // Tráfico serial (RX/TX)
    socket.on('serial_traffic', (data) => {
      addSerialTraffic(data.role, data.type, data.data);
    });

    // Detección de carro por YOLO (solo informativo)
    socket.on('yolo_detection', (data) => {
      setYoloDetection({
        detected: !!(data && data.detected),
        confidence: (data && data.confidence) || 0
      });
    });

    // Telemetría entrante de sensores
    socket.on('sensor_data', (data) => {
      if (data.type === 'distance') {
        setHomeState(prev => ({
          ...prev,
          garaje: {
            ...prev.garaje,
            distance: data.value
          }
        }));
      } else if (data.type === 'garaje_door') {
        setHomeState(prev => ({
          ...prev,
          garaje: {
            ...prev.garaje,
            door: data.value
          }
        }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // --- 1.2 SOLO DATOS REALES ---
  // (Se eliminó el bucle de "fluctuación orgánica" que cada 2s inventaba
  //  temperatura/humedad/gas/distancia aleatorios. Ese bucle pisaba las
  //  lecturas reales del DHT11/MQ y, al re-renderizar el Provider cada 2s,
  //  reiniciaba el reconocedor de voz. El estado ahora SOLO cambia con datos
  //  reales que llegan por Socket.IO (home_state_update / sensor_data) o por
  //  Web Serial local.)

  // --- 2. SÍNTESIS DE LOGS LOCALES ---
  const addSystemLog = (source, message) => {
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      command: message,
      intent: 'LOG',
      module: source,
      status: 'info'
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const addSerialTraffic = (role, type, data) => {
    const newTraffic = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      role,
      type, // 'tx' (enviado) o 'rx' (recibido)
      data
    };
    setSerialTraffic(prev => [newTraffic, ...prev].slice(0, 30));
  };

  // --- 3. FUNCIONES DE PUERTO SERIADOS DEL SERVIDOR (SOCKET.IO) ---
  const scanServerPorts = () => {
    if (!socketRef.current || !isServerConnected) return;
    socketRef.current.emit('get_ports', (ports) => {
      setServerPorts(ports);
    });
  };

  const connectServerSerial = (role, path) => {
    if (!socketRef.current || !isServerConnected) return;
    socketRef.current.emit('connect_serial', { role, path });
  };

  const disconnectServerSerial = (role) => {
    if (!socketRef.current || !isServerConnected) return;
    socketRef.current.emit('disconnect_serial', { role });
  };

  // --- 4. INTEGRACIÓN DE WEB SERIAL API DIRECTA EN EL NAVEGADOR ---
  const isWebSerialSupported = () => {
    return 'serial' in navigator;
  };

  const connectLocalPort = async (role) => {
    if (!isWebSerialSupported()) {
      alert('Tu navegador no soporta Web Serial API. Usa Chrome o Edge.');
      return;
    }

    try {
      addSystemLog('WEB_SERIAL', `Solicitando puerto USB para ${role}...`);
      
      // Solicitar permiso de puerto al usuario
      const port = await navigator.serial.requestPort();
      
      // Abrir a 9600 baudios
      await port.open({ baudRate: 9600 });
      
      // Configurar codificador para escritura
      const textEncoder = new TextEncoderStream();
      const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
      const writer = textEncoder.writable.getWriter();

      // Configurar decodificador para lectura
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();

      setLocalSerialPorts(prev => ({
        ...prev,
        [role]: {
          port,
          writer,
          reader,
          status: 'CONNECTED'
        }
      }));

      addSystemLog('WEB_SERIAL', `Conectado localmente en puerto a ${role}`);
      
      // Iniciar el bucle de lectura en segundo plano
      readLocalSerialLoop(role, reader);

    } catch (error) {
      console.error('[WEB SERIAL] Error conectando:', error);
      addSystemLog('WEB_SERIAL', `Error: ${error.message}`);
      setLocalSerialPorts(prev => ({
        ...prev,
        [role]: { ...prev[role], status: 'ERROR' }
      }));
    }
  };

  // Bucle de escucha continuo de datos desde el puerto serie del navegador
  const readLocalSerialLoop = async (role, reader) => {
    localReadersRef.current[role] = reader;
    let buffer = '';
    
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // El lector fue cancelado
          break;
        }
        if (value) {
          buffer += value;
          // Procesar líneas separadas por retorno de carro o salto de línea
          let parts = buffer.split(/\r?\n/);
          buffer = parts.pop(); // Mantener el fragmento incompleto en el buffer

          for (const line of parts) {
            const cleanedLine = line.trim();
            if (cleanedLine.length > 0) {
              addSerialTraffic(role, 'rx', cleanedLine);
              processLocalIncomingData(role, cleanedLine);
            }
          }
        }
      }
    } catch (error) {
      console.error(`[WEB SERIAL] Error leyendo de ${role}:`, error);
      addSystemLog('WEB_SERIAL', `Error de lectura en ${role}: ${error.message}`);
      disconnectLocalPort(role);
    }
  };

  const disconnectLocalPort = async (role) => {
    const conn = localSerialPorts[role];
    if (!conn || conn.status === 'DISCONNECTED') return;

    addSystemLog('WEB_SERIAL', `Cerrando puerto para ${role}...`);

    try {
      // Cancelar lectura activa
      if (localReadersRef.current[role]) {
        await localReadersRef.current[role].cancel();
      }

      if (conn.writer) {
        await conn.writer.close();
      }

      if (conn.port) {
        await conn.port.close();
      }
    } catch (e) {
      console.warn('Error durante el cierre limpio de puerto:', e);
    }

    setLocalSerialPorts(prev => ({
      ...prev,
      [role]: {
        port: null,
        writer: null,
        reader: null,
        status: 'DISCONNECTED'
      }
    }));
    addSystemLog('WEB_SERIAL', `${role} desconectado.`);
  };

  // Procesamiento de datos de entrada en modo Web Serial local
  const processLocalIncomingData = (role, data) => {
    let distVal = null;
    if (data.startsWith('DIST:')) {
      distVal = parseInt(data.substring(5));
    } else if (data.toLowerCase().includes('distancia:')) {
      const match = data.match(/distancia:\s*(\d+)/i);
      if (match) {
        distVal = parseInt(match[1]);
      }
    }

    if (distVal !== null && !isNaN(distVal)) {
      setHomeState(prev => {
        const fresh = {
          ...prev,
          garaje: { ...prev.garaje, distance: distVal }
        };
        
        const currentDoorState = prev.garaje.door;
        let newDoorState = currentDoorState;
        
        // Lógica del Garaje: <= 5cm cierra, > 5cm abre
        if (distVal <= 5) {
          newDoorState = 'CLOSED';
        } else {
          newDoorState = 'OPEN';
        }

        if (newDoorState !== currentDoorState) {
          fresh.garaje.door = newDoorState;
          
          // Registrar log local
          const newAccessLog = {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toISOString(),
            action: newDoorState,
            distance: distVal
          };
          setGarageAccessLogs(prevLogs => [newAccessLog, ...prevLogs].slice(0, 20));
          addSystemLog('GARAJE_LOCAL', `Portón ${newDoorState === 'OPEN' ? 'Abierto' : 'Cerrado'} | Distancia: ${distVal}cm`);
          
          // Enviar comando serial físico al Arduino Único (Arduino 1 en com5)
          sendLocalSerialCommand('arduino1', newDoorState === 'OPEN' ? 'ABRIR' : 'CERRAR');
        }
        return fresh;
      });
    }

    // Procesar estado del portón directo si el hardware lo reporta
    if (data.includes('Puerta CERRADA') || data.includes('GARAJE_STATE:CLOSED') || data.includes('GARAJE_AUTO_CLOSED') || data.includes('Garaje Cerrado')) {
      setHomeState(prev => {
        if (prev.garaje.door !== 'CLOSED') {
          const fresh = { ...prev };
          fresh.garaje.door = 'CLOSED';
          const newAccessLog = {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toISOString(),
            action: 'CLOSED',
            distance: prev.garaje.distance
          };
          setGarageAccessLogs(prevLogs => [newAccessLog, ...prevLogs].slice(0, 20));
          addSystemLog('GARAJE_LOCAL', `Portón Cerrado (Confirmado por Hardware)`);
          return fresh;
        }
        return prev;
      });
    } else if (data.includes('Puerta ABIERTA') || data.includes('GARAJE_STATE:OPEN') || data.includes('Garaje Abierto')) {
      setHomeState(prev => {
        if (prev.garaje.door !== 'OPEN') {
          const fresh = { ...prev };
          fresh.garaje.door = 'OPEN';
          const newAccessLog = {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toISOString(),
            action: 'OPEN',
            distance: prev.garaje.distance
          };
          setGarageAccessLogs(prevLogs => [newAccessLog, ...prevLogs].slice(0, 20));
          addSystemLog('GARAJE_LOCAL', `Portón Abierto (Confirmado por Hardware)`);
          return fresh;
        }
        return prev;
      });
    }
    
    if (data.startsWith('BANO_STATE:')) {
      const mode = data.substring(11);
      setHomeState(prev => ({
        ...prev,
        bano: {
          ...prev.bano,
          mode,
          rgbColor: mode === 'SPA' ? '#ff0055' : mode === 'MANANA' ? '#00f0ff' : mode === 'NOCHE' ? '#00ff66' : '#1e293b',
          state: mode === 'OFF' ? 'OFF' : 'ON'
        }
      }));
    } else if (data === 'SPA' || data === 'MANANA' || data === 'NOCHE' || data === 'OFF') {
      setHomeState(prev => ({
        ...prev,
        bano: {
          ...prev.bano,
          mode: data,
          rgbColor: data === 'SPA' ? '#ff0055' : data === 'MANANA' ? '#00f0ff' : data === 'NOCHE' ? '#00ff66' : '#1e293b',
          state: data === 'OFF' ? 'OFF' : 'ON'
        }
      }));
    }

    // Procesar datos climáticos de DHT11
    if (data.startsWith('TEMP:')) {
      const tempVal = parseFloat(data.substring(5));
      if (!isNaN(tempVal)) {
        setHomeState(prev => ({
          ...prev,
          cocina: { ...prev.cocina, temp: tempVal },
          habitacion: { ...prev.habitacion, temp: tempVal }
        }));
      }
    }
    else if (data.startsWith('HUM:')) {
      const humVal = parseFloat(data.substring(4));
      if (!isNaN(humVal)) {
        setHomeState(prev => ({
          ...prev,
          cocina: { ...prev.cocina, humidity: humVal },
          habitacion: { ...prev.habitacion, humidity: humVal }
        }));
      }
    }
    // Procesar sensor de gas MQ
    else if (data.startsWith('GAS:')) {
      const gasVal = parseInt(data.substring(4));
      if (!isNaN(gasVal)) {
        setHomeState(prev => {
          const oldGasAlert = prev.cocina.gasAlert;
          const gasAlert = gasVal > 500;
          if (gasAlert && !oldGasAlert) {
            addSystemLog('ALERTA_GAS', `¡Fuga de gas detectada!: ${gasVal} ppm`);
          }
          return {
            ...prev,
            cocina: {
              ...prev.cocina,
              gasLevel: gasVal,
              gasAlert
            }
          };
        });
      }
    }
    // Procesar sensor de fuego
    else if (data.startsWith('FIRE:')) {
      const fireVal = parseInt(data.substring(5));
      if (!isNaN(fireVal)) {
        setHomeState(prev => {
          const oldFireAlert = prev.cocina.fireAlert;
          const fireAlert = fireVal === 1;
          if (fireAlert && !oldFireAlert) {
            addSystemLog('CRÍTICO', `¡Incendio detectado en la cocina!`);
          }
          return {
            ...prev,
            cocina: {
              ...prev.cocina,
              fireAlert
            }
          };
        });
      }
    }
  };

  const sendLocalSerialCommand = async (role, command) => {
    const conn = localSerialPorts[role];
    if (!conn || conn.status !== 'CONNECTED' || !conn.writer) {
      addSystemLog('WEB_SERIAL_ERR', `No se pudo enviar "${command}". ${role} no conectado.`);
      return false;
    }

    try {
      addSerialTraffic(role, 'tx', command);
      await conn.writer.write(`${command}\n`);
      return true;
    } catch (error) {
      console.error('[WEB SERIAL] Error escribiendo:', error);
      addSystemLog('WEB_SERIAL', `Error enviando comando a ${role}: ${error.message}`);
      return false;
    }
  };

  // --- 5. ENRUTADOR GLOBAL DE COMANDOS (VOZ Y MANUAL) ---
  const triggerVoiceCommand = (data) => {
    const { rawText, interpretation } = data;
    const { intent, module, commandToSend } = interpretation;

    if (serialMode === 'server') {
      // Modo Servidor: Delegar al backend Node.js
      if (socketRef.current && isServerConnected) {
        socketRef.current.emit('voice_command', data);
      } else {
        // Fallback local en memoria si el servidor está apagado
        processVoiceCommandInMemory(data);
      }
    } else {
      // Modo Local: Procesar localmente en el navegador y enviar vía Web Serial
      processVoiceCommandInMemory(data);
      
      // Enviar comando a Arduino
      const targetLocalArduino = getArduinoRoleForModule(module);
      if (targetLocalArduino && commandToSend) {
        sendLocalSerialCommand(targetLocalArduino, commandToSend);
      }
    }
  };

  const triggerManualControl = (module, field, value, commandToSend) => {
    if (serialMode === 'server') {
      if (socketRef.current && isServerConnected) {
        socketRef.current.emit('manual_control', { module, field, value, commandToSend });
      } else {
        // Fallback local
        updateStateInMemory(module, field, value);
        addSystemLog('LOCAL_FALLBACK', `Manual: ${field} -> ${value} (Servidor offline)`);
      }
    } else {
      // Modo Local (Web Serial API)
      updateStateInMemory(module, field, value);
      addSystemLog('WEB_SERIAL_TX', `Manual: ${field} -> ${value}`);
      
      const targetLocalArduino = getArduinoRoleForModule(module);
      if (targetLocalArduino && commandToSend) {
        sendLocalSerialCommand(targetLocalArduino, commandToSend);
      }
    }
  };

  // Simulación directa del slider en el frontend (Deshabilitada por usuario)
  const triggerSensorSimulation = (type, value) => {
    // Simulación desactivada: Solo se procesan datos seriales físicos reales
  };

  // Helper para resolver qué módulo va a qué Arduino
  const getArduinoRoleForModule = (module) => {
    const mappings = {
      bano: 'arduino1',
      cocina: 'arduino2',
      sala: 'arduino3',
      habitacion: 'arduino2',
      garaje: 'arduino1'
    };
    return mappings[module] || null;
  };

  // Procesamiento local de comandos de voz (si no hay backend)
  const processVoiceCommandInMemory = (data) => {
    const { rawText, interpretation } = data;
    const { intent, module } = interpretation;

    // Crear log en pantalla
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      command: rawText,
      intent,
      module,
      status: 'success'
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));

    // Modificar estado en memoria
    setHomeState(prev => {
      const state = JSON.parse(JSON.stringify(prev)); // Clonar profundo
      
      switch (intent) {
        case 'MODO_SPA':
          state.bano.state = 'ON';
          state.bano.mode = 'SPA';
          state.bano.rgbColor = '#ff0055';
          break;
        case 'MODO_MANANA':
          state.bano.state = 'ON';
          state.bano.mode = 'MANANA';
          state.bano.rgbColor = '#00f0ff';
          break;
        case 'MODO_NOCHE':
          state.bano.state = 'ON';
          state.bano.mode = 'NOCHE';
          state.bano.rgbColor = '#00ff66';
          break;
        case 'APAGAR_BANO':
          state.bano.state = 'OFF';
          state.bano.mode = 'OFF';
          state.bano.rgbColor = '#1e293b';
          break;
        case 'ENCENDER_COCINA':
          state.cocina.lights = true;
          state.cocina.stove = true;
          state.cocina.fan = true;
          break;
        case 'APAGAR_COCINA':
          state.cocina.lights = false;
          state.cocina.stove = false;
          state.cocina.fan = false;
          break;
        case 'VENTILACION_ON':
          state.cocina.fan = true;
          break;
        case 'VENTILACION_OFF':
          state.cocina.fan = false;
          break;
        case 'LUCES_COCINA_ON':
          state.cocina.lights = true;
          break;
        case 'LUCES_COCINA_OFF':
          state.cocina.lights = false;
          break;
        case 'TV_ON':
          state.sala.tv = true;
          break;
        case 'TV_OFF':
          state.sala.tv = false;
          break;
        case 'PIANO_ON':
          state.sala.piano = true;
          break;
        case 'JUEGO_ON':
          state.sala.game = true;
          break;
        case 'SUBIR_PERSIANA':
          state.habitacion.blinds = 100;
          break;
        case 'BAJAR_PERSIANA':
          state.habitacion.blinds = 0;
          break;
        case 'APAGAR_LUCES_HABITACION':
          state.habitacion.lights = false;
          break;
        case 'ENCENDER_LUCES_HABITACION':
          state.habitacion.lights = true;
          break;
        case 'ABRIR_GARAJE':
          state.garaje.door = 'OPEN';
          state.garaje.distance = 15;
          break;
        case 'CERRAR_GARAJE':
          state.garaje.door = 'CLOSED';
          state.garaje.distance = 20;
          break;
        case 'APAGAR_TODO':
          state.bano.state = 'OFF';
          state.bano.mode = 'OFF';
          state.bano.rgbColor = '#1e293b';
          state.cocina.lights = false;
          state.cocina.stove = false;
          state.cocina.nevera = false;
          break;
        default:
          break;
      }
      return state;
    });
  };

  const updateStateInMemory = (module, field, value) => {
    setHomeState(prev => {
      const copy = { ...prev };
      if (copy[module]) {
        copy[module] = { ...copy[module], [field]: value };
      }
      return copy;
    });
  };

  return (
    <SmartHomeContext.Provider value={{
      homeState,
      logs,
      garageAccessLogs,
      serialTraffic,
      serverPorts,
      yoloDetection,
      serialMode,
      setSerialMode,
      isServerConnected,
      serverSerialStatus,
      localSerialPorts,
      
      // Controladores
      triggerVoiceCommand,
      triggerManualControl,
      triggerSensorSimulation,
      
      // Acciones del Servidor
      scanServerPorts,
      connectServerSerial,
      disconnectServerSerial,
      
      // Acciones Web Serial Local
      isWebSerialSupported,
      connectLocalPort,
      disconnectLocalPort
    }}>
      {children}
    </SmartHomeContext.Provider>
  );
};
