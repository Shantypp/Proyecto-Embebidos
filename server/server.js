const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./database');
const serialManager = require('./serialManager');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Ruta básica de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Ruta para obtener logs históricos directamente por API HTTP
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await db.getLogs(50);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const server = http.createServer(app);

// Configurar Socket.IO con CORS amplio para desarrollo local
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Lógica de Telemetría Unificada y Automatizaciones
async function handleSensorData(type, value, source) {
  const currentState = await db.getHomeState();
  let changed = false;

  if (type === 'distance') {
    currentState.garaje.distance = value;
    changed = true;

    const currentDoorState = currentState.garaje.door;
    let newDoorState = currentDoorState;

    // Lógica del Garaje: <= 5cm cierra, > 5cm abre
    if (value <= 5) {
      newDoorState = 'CLOSED';
    } else {
      newDoorState = 'OPEN';
    }

    if (newDoorState !== currentDoorState) {
      currentState.garaje.door = newDoorState;
      
      // Registrar log de acceso en la base de datos
      await db.logGarageAccess(newDoorState, value);
      
      // Enviar comando serial al Arduino del Garaje (Arduino 1)
      const cmdToSend = newDoorState === 'OPEN' ? 'ABRIR' : 'CERRAR';
      serialManager.sendCommand('arduino1', cmdToSend);
      
      // Emitir logs de garaje actualizados
      const updatedGarageLogs = await db.getGarageAccessLogs(15);
      io.emit('garage_logs_update', updatedGarageLogs);
      
      // Guardar comando en historial
      await db.logCommand(
        `[AUTO] Radar HC-SR04: ${value}cm -> Garaje ${newDoorState === 'OPEN' ? 'Abierto' : 'Cerrado'}`,
        `GARAJE_${newDoorState}`,
        'garaje',
        'success',
        cmdToSend
      );
      const updatedLogs = await db.getLogs(20);
      io.emit('logs_history', updatedLogs);
    }
  } else if (type === 'garaje_door') {
    const currentDoorState = currentState.garaje.door;
    if (currentDoorState !== value) {
      currentState.garaje.door = value;
      changed = true;

      // Registrar log de acceso en la base de datos
      await db.logGarageAccess(value, currentState.garaje.distance);

      // Emitir logs de garaje actualizados
      const updatedGarageLogs = await db.getGarageAccessLogs(15);
      io.emit('garage_logs_update', updatedGarageLogs);

      // Guardar comando en historial
      await db.logCommand(
        `[AUTO] Portón detectado ${value === 'OPEN' ? 'Abierto' : 'Cerrado'} por confirmación física`,
        `GARAJE_${value}`,
        'garaje',
        'success',
        ''
      );
      const updatedLogs = await db.getLogs(20);
      io.emit('logs_history', updatedLogs);
    }
  } else if (type === 'bano_state') {
    currentState.bano.state = value === 'OFF' ? 'OFF' : 'ON';
    currentState.bano.mode = value;
    currentState.bano.rgbColor = value === 'SPA' ? '#ff0055' : value === 'MANANA' ? '#00f0ff' : value === 'NOCHE' ? '#00ff66' : '#1e293b';
    changed = true;
  } else if (type === 'temp') {
    if (!currentState.cocina) currentState.cocina = {};
    if (!currentState.habitacion) currentState.habitacion = {};
    currentState.cocina.temp = value;
    currentState.habitacion.temp = value;
    changed = true;
  } else if (type === 'humidity') {
    if (!currentState.cocina) currentState.cocina = {};
    if (!currentState.habitacion) currentState.habitacion = {};
    currentState.cocina.humidity = value;
    currentState.habitacion.humidity = value;
    changed = true;
  } else if (type === 'gas') {
    if (!currentState.cocina) currentState.cocina = {};
    currentState.cocina.gasLevel = value;
    const oldGasAlert = currentState.cocina.gasAlert;
    currentState.cocina.gasAlert = (value > 500);
    changed = true;

    if (currentState.cocina.gasAlert && !oldGasAlert) {
      await db.logCommand(
        `[ALERTA] ¡Fuga de gas detectada!: ${value} ppm`,
        `GAS_ALERT`,
        'cocina',
        'danger',
        'BUZZER_ON'
      );
      const updatedLogs = await db.getLogs(20);
      io.emit('logs_history', updatedLogs);
    }
  } else if (type === 'fire') {
    if (!currentState.cocina) currentState.cocina = {};
    const oldFireAlert = currentState.cocina.fireAlert;
    currentState.cocina.fireAlert = (value === 1);
    changed = true;

    if (currentState.cocina.fireAlert && !oldFireAlert) {
      await db.logCommand(
        `[CRÍTICO] ¡Incendio detectado en la cocina!`,
        `FIRE_ALERT`,
        'cocina',
        'danger',
        'BUZZER_PARPADEO_ON'
      );
      const updatedLogs = await db.getLogs(20);
      io.emit('logs_history', updatedLogs);
    }
  }

  if (changed) {
    await db.saveHomeState(currentState);
    io.emit('home_state_update', currentState);
  }
}

// Serializar el procesamiento de sensores para evitar condiciones de carrera.
// El Arduino envia TEMP/HUM/GAS/FIRE casi al mismo tiempo; sin esta cola, cada
// callback leia el mismo estado base y al guardar se pisaban entre si (la humedad
// se quedaba en su valor base). Encadenando las promesas, cada lectura completa
// su leer-modificar-guardar antes de que empiece la siguiente.
let sensorQueue = Promise.resolve();
function handleSensorDataQueued(type, value, source) {
  sensorQueue = sensorQueue
    .then(() => handleSensorData(type, value, source))
    .catch((err) => console.error('[SENSOR QUEUE] Error:', err));
  return sensorQueue;
}

// Inicializar el gestor de puertos seriales con el callback unificado (en cola)
serialManager.init(io, handleSensorDataQueued);

// Conectar a Base de Datos e Iniciar Servidor
db.connect().then(() => {
  server.listen(PORT, () => {
    console.log('\x1b[32m%s\x1b[0m', `[SERVER] Smart Home Backend escuchando en http://localhost:${PORT}`);
  });
});

// Mapeo lógico de Módulos de la casa a Arduinos
// NOTA: Baño y Garaje en Arduino 1; Cocina y Habitación en Arduino 2
const MODULE_TO_ARDUINO = {
  bano: 'arduino1',
  cocina: 'arduino2',
  sala: 'arduino3',
  habitacion: 'arduino2',
  garaje: 'arduino1'
};

// Manejador de conexiones WebSocket
io.on('connection', async (socket) => {
  console.log(`[SOCKET] Cliente conectado ID: ${socket.id}`);

  // 1. Enviar estado actual de la casa
  const homeState = await db.getHomeState();
  socket.emit('home_state_update', homeState);

  // 2. Enviar estado de conexiones seriales
  socket.emit('serial_connections_status', serialManager.getConnectionStatus());

  // 3. Enviar logs recientes de comandos
  const logs = await db.getLogs(20);
  socket.emit('logs_history', logs);

  // 4. Enviar logs recientes del acceso al garaje
  const garageLogs = await db.getGarageAccessLogs(15);
  socket.emit('garage_logs_update', garageLogs);

  // EVENTO: Escanear puertos COM disponibles
  socket.on('get_ports', async (callback) => {
    console.log('[SOCKET] Escaneo de puertos solicitado');
    const ports = await serialManager.listPorts();
    if (typeof callback === 'function') {
      callback(ports);
    }
  });

  // EVENTO: Conectar a puerto COM
  socket.on('connect_serial', ({ role, path }) => {
    try {
      serialManager.connectPort(role, path);
    } catch (error) {
      console.error('[SOCKET] Error conectando puerto:', error);
      socket.emit('system_log', {
        timestamp: new Date().toISOString(),
        source: 'SERVER',
        message: `Fallo de conexión en ${role}: ${error.message}`
      });
    }
  });

  // EVENTO: Desconectar puerto COM
  socket.on('disconnect_serial', ({ role }) => {
    serialManager.disconnectPort(role);
  });

  // EVENTO: Recepción de comando por VOZ
  socket.on('voice_command', async (data) => {
    const { rawText, interpretation } = data;
    const { intent, module, commandToSend } = interpretation;

    console.log(`\x1b[35m%s\x1b[0m`, `[VOICE COMMAND] Texto: "${rawText}" -> Intento: "${intent}", Módulo: "${module}"`);

    // 1. Registrar el comando en la base de datos
    await db.logCommand(rawText, intent, module, 'success', `Comando Serial: ${commandToSend}`);

    // 2. Actualizar el estado global de la casa en el backend
    const currentState = await db.getHomeState();
    
    // Modificar estado según la intención
    updateStateFromIntent(currentState, intent, module, commandToSend);

    // Guardar nuevo estado en base de datos
    await db.saveHomeState(currentState);

    // Broadcast del nuevo estado a TODOS los clientes conectados
    io.emit('home_state_update', currentState);

    // Broadcast del log actualizado a todos
    const updatedLogs = await db.getLogs(20);
    io.emit('logs_history', updatedLogs);

    // 3. Enviar comando serial al Arduino correcto
    if (intent === 'APAGAR_TODO') {
      serialManager.sendCommand('arduino1', 'OFF');
      serialManager.sendCommand('arduino2', 'off');
    } else {
      const targetArduino = MODULE_TO_ARDUINO[module];
      if (targetArduino && commandToSend) {
        serialManager.sendCommand(targetArduino, commandToSend);
      }
    }
  });

  // EVENTO: Control Manual desde el Dashboard (Clicks en botones)
  socket.on('manual_control', async (data) => {
    const { module, field, value, commandToSend } = data;
    console.log(`[MANUAL CONTROL] Modulo: ${module}, Campo: ${field}, Valor: ${value}`);

    const currentState = await db.getHomeState();
    
    // Actualizar estado
    if (currentState[module]) {
      currentState[module][field] = value;
      
      // Regla de negocio especial para el garaje
      if (module === 'garaje' && field === 'door') {
        // Si se abre/cierra manualmente, la distancia se simula concordante
        currentState[module].distance = value === 'OPEN' ? 15 : 20;
      }
    }

    await db.saveHomeState(currentState);
    io.emit('home_state_update', currentState);

    // Enviar comando serial al Arduino correspondiente
    const targetArduino = MODULE_TO_ARDUINO[module];
    if (targetArduino && commandToSend) {
      serialManager.sendCommand(targetArduino, commandToSend);
    }

    // Registrar control manual en los logs
    await db.logCommand(`[CLICK] ${field} -> ${value}`, `Manual: ${field}_${value}`, module, 'success', `Comando Serial: ${commandToSend}`);
    const updatedLogs = await db.getLogs(20);
    io.emit('logs_history', updatedLogs);
  });

  // EVENTO: Detección de carro por YOLO (cámara del iPhone)
  // MODO SOLO-DETECCIÓN: solo retransmite al dashboard. NO toca el garaje ni el Arduino.
  socket.on('yolo_detection', (data) => {
    const detected = !!(data && data.detected);
    const confidence = (data && data.confidence) || 0;

    // Reenviar a todos los clientes para mostrar el indicador en el front
    io.emit('yolo_detection', { detected, confidence });

    // Dejar constancia en el terminal de logs
    io.emit('system_log', {
      timestamp: new Date().toISOString(),
      source: 'YOLO',
      message: detected
        ? `Carro detectado (confianza ${Math.round(confidence * 100)}%)`
        : 'Carro fuera de cuadro'
    });
  });

  // EVENTO: Simulación de Sensores (Deshabilitado por usuario)
  socket.on('update_sensor_simulation', () => {
    // No-op: Solo datos reales
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Cliente desconectado ID: ${socket.id}`);
  });
});

// Función auxiliar para actualizar el modelo de estado según los comandos de voz
function updateStateFromIntent(state, intent, module, command) {
  switch (intent) {
    // BAÑO
    case 'MODO_SPA':
      state.bano.state = 'ON';
      state.bano.mode = 'SPA';
      state.bano.rgbColor = '#ff0055'; // Rojo Spa
      break;
    case 'MODO_MANANA':
      state.bano.state = 'ON';
      state.bano.mode = 'MANANA';
      state.bano.rgbColor = '#00f0ff'; // Azul Mañana
      break;
    case 'MODO_NOCHE':
      state.bano.state = 'ON';
      state.bano.mode = 'NOCHE';
      state.bano.rgbColor = '#00ff66'; // Verde Noche
      break;
    case 'APAGAR_BANO':
      state.bano.state = 'OFF';
      state.bano.mode = 'OFF';
      state.bano.rgbColor = '#1e293b'; // Off
      break;

    // COCINA
    case 'ENCENDER_NEVERA':
      state.cocina.nevera = true;
      break;
    case 'ENCENDER_LUZ_COCINA':
      state.cocina.lights = true;
      break;
    case 'ENCENDER_ESTUFA':
      state.cocina.stove = true;
      break;
    case 'APAGAR_COCINA':
      state.cocina.lights = false;
      state.cocina.stove = false;
      state.cocina.nevera = false;
      break;

    // SALA
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

    // HABITACIÓN
    case 'ABRIR_PERSIANA':
    case 'SUBIR_PERSIANA':
      state.habitacion.blinds = 100; // Abierta total
      break;
    case 'CERRAR_PERSIANA':
    case 'BAJAR_PERSIANA':
      state.habitacion.blinds = 0; // Cerrada total
      break;
    case 'APAGAR_LUCES_HABITACION':
      state.habitacion.lights = false;
      break;
    case 'ENCENDER_LUCES_HABITACION':
      state.habitacion.lights = true;
      break;

    // GARAJE
    case 'ABRIR_GARAJE':
      state.garaje.door = 'OPEN';
      state.garaje.distance = 15; // Distancia segura simulada
      break;
    case 'CERRAR_GARAJE':
      state.garaje.door = 'CLOSED';
      state.garaje.distance = 20;
      break;

    case 'APAGAR_TODO':
      if (!state.bano) state.bano = {};
      state.bano.state = 'OFF';
      state.bano.mode = 'OFF';
      state.bano.rgbColor = '#1e293b';

      if (!state.cocina) state.cocina = {};
      state.cocina.lights = false;
      state.cocina.stove = false;
      state.cocina.nevera = false;
      break;
      
    default:
      console.log(`[INTENT] Sin mapeo de estado específico para el intento: ${intent}`);
  }
}
