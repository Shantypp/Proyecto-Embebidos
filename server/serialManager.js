let SerialPortLib = null;
try {
  SerialPortLib = require('serialport');
} catch (e) {
  console.warn('\x1b[33m%s\x1b[0m', '[WARN] Librería native "serialport" no disponible. Se utilizará el MODO SIMULACIÓN de Hardware.');
}

const activeConnections = {
  arduino1: { port: null, parser: null, path: null, status: 'DISCONNECTED' }, // Baño + Garaje
  arduino2: { port: null, parser: null, path: null, status: 'DISCONNECTED' }, // Cocina + Habitación
  arduino3: { port: null, parser: null, path: null, status: 'DISCONNECTED' }, // Sala / Futuro
};

// Guardamos referencia al IO de Socket.IO para poder emitir eventos directamente
let ioInstance = null;
let sensorDataCallback = null;

const serialManager = {
  init(io, onSensorData) {
    ioInstance = io;
    sensorDataCallback = onSensorData;
    console.log('[SERIAL] Inicializado manejador serial');
    
    // Iniciar simulación de telemetría automática para puertos no conectados físicamente
    this.startMockTelemetry();
  },

  // Obtener lista de puertos COM disponibles
  async listPorts() {
    if (!SerialPortLib) {
      // Puertos virtuales simulados
      return [
        { path: 'COM3', manufacturer: 'Arduino LLC (www.arduino.cc)', friendlyName: 'Arduino Uno (COM3)' },
        { path: 'COM4', manufacturer: 'Silicon Labs', friendlyName: 'Arduino Nano (COM4)' },
        { path: 'COM5', manufacturer: 'Arduino LLC (www.arduino.cc)', friendlyName: 'Arduino Mega (COM5)' }
      ];
    }

    try {
      const ports = await SerialPortLib.SerialPort.list();
      return ports;
    } catch (error) {
      console.error('[SERIAL] Error escaneando puertos seriales:', error);
      return [];
    }
  },

  // Conectar un puerto COM a un Arduino en particular
  connectPort(role, path, baudRate = 9600) {
    if (!activeConnections[role]) {
      throw new Error(`Rol de Arduino desconocido: ${role}`);
    }

    // Si ya estaba conectado, desconectar primero
    this.disconnectPort(role);

    console.log(`[SERIAL] Conectando ${role} en el puerto ${path}...`);
    activeConnections[role].path = path;
    activeConnections[role].status = 'CONNECTING';
    this.emitStatusUpdate();

    if (!SerialPortLib) {
      // Simulación de puerto serie conectado
      setTimeout(() => {
        activeConnections[role].status = 'CONNECTED';
        console.log(`\x1b[32m%s\x1b[0m`, `[SERIAL] [SIMULADO] ${role} conectado en ${path}`);
        this.emitStatusUpdate();
        
        // Log simulado
        this.logToFrontend(`Sistema serial simulado conectó ${role} en ${path}`);
      }, 800);
      return true;
    }

    try {
      const port = new SerialPortLib.SerialPort({
        path: path,
        baudRate: parseInt(baudRate),
        autoOpen: true
      });

      const { ReadlineParser } = require('@serialport/parser-readline');
      const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      activeConnections[role].port = port;
      activeConnections[role].parser = parser;

      port.on('open', () => {
        activeConnections[role].status = 'CONNECTED';
        console.log(`\x1b[32m%s\x1b[0m`, `[SERIAL] ${role} conectado con éxito en ${path}`);
        this.emitStatusUpdate();
        this.logToFrontend(`${role} conectado físicamente en ${path}`);
      });

      port.on('close', () => {
        activeConnections[role].status = 'DISCONNECTED';
        console.log(`[SERIAL] Puerto ${path} cerrado para ${role}`);
        this.emitStatusUpdate();
        this.logToFrontend(`Puerto ${path} cerrado para ${role}. Reintentando...`);
        this.handleAutoReconnect(role, path);
      });

      port.on('error', (err) => {
        activeConnections[role].status = 'ERROR';
        console.error(`[SERIAL] Error en puerto ${path} (${role}):`, err.message);
        this.emitStatusUpdate();
        this.logToFrontend(`Error en puerto ${path} (${role}): ${err.message}`);
      });

      // Escuchar datos del Arduino
      parser.on('data', (data) => {
        const cleanedData = data.toString().trim();
        console.log(`[SERIAL IN] [${role}] -> ${cleanedData}`);
        
        // Emitir datos brutos a la consola de logs
        this.emitSerialDataEvent(role, 'rx', cleanedData);

        // Procesar entradas especiales (como telemetría del sensor ultrasónico)
        this.processIncomingSerialData(role, cleanedData);
      });

    } catch (error) {
      activeConnections[role].status = 'ERROR';
      console.error(`[SERIAL] Error abriendo puerto ${path}:`, error);
      this.emitStatusUpdate();
      this.logToFrontend(`Fallo al abrir puerto ${path}: ${error.message}`);
    }
  },

  // Desconectar puerto COM
  disconnectPort(role) {
    const conn = activeConnections[role];
    if (!conn) return;

    if (conn.port && conn.port.isOpen) {
      console.log(`[SERIAL] Cerrando conexión de ${role} en ${conn.path}`);
      conn.port.close();
    }

    conn.port = null;
    conn.parser = null;
    conn.path = null;
    conn.status = 'DISCONNECTED';
    this.emitStatusUpdate();
  },

  // Re-conexión automática si se desconecta físicamente
  handleAutoReconnect(role, path) {
    // Si la conexión fue removida a propósito, no reconectar
    if (activeConnections[role].status === 'DISCONNECTED') return;

    setTimeout(() => {
      console.log(`[SERIAL] Reintentando conectar ${role} en ${path}...`);
      this.connectPort(role, path);
    }, 5000);
  },

  // Enviar comando a Arduino
  sendCommand(role, command) {
    const conn = activeConnections[role];
    if (!conn) {
      console.error(`[SERIAL OUT] Rol desconocido: ${role}`);
      return false;
    }

    const commandWithDelim = `${command}\n`;

    // Emitir comando saliente a la consola del frontend
    this.emitSerialDataEvent(role, 'tx', command);

    if (conn.status !== 'CONNECTED') {
      console.log(`[SERIAL OUT] [${role}] (NO CONECTADO) Comando descartado o simulado: ${command}`);
      
      // En modo simulación, si el Arduino 1 recibe ABRIR o CERRAR, respondemos con eventos de garaje
      if (!SerialPortLib && role === 'arduino1') {
        setTimeout(() => {
          if (command === 'ABRIR') {
            this.emitMockSensorData('garaje_door', 'OPEN');
            this.logToFrontend('[SIMULADO Arduino 1] Servo portón abierto a 90 grados.');
          } else if (command === 'CERRAR') {
            this.emitMockSensorData('garaje_door', 'CLOSED');
            this.logToFrontend('[SIMULADO Arduino 1] Servo portón cerrado a 0 grados.');
          }
        }, 500);
      }
      return false;
    }

    // Escritura real en puerto serial físico
    conn.port.write(commandWithDelim, (err) => {
      if (err) {
        console.error(`[SERIAL OUT] Error escribiendo en ${role}:`, err.message);
        this.logToFrontend(`Error enviando comando a ${role}: ${err.message}`);
      } else {
        console.log(`[SERIAL OUT] [${role}] -> ${command}`);
      }
    });

    return true;
  },

  // Procesar mensajes entrantes desde el Arduino físico
  processIncomingSerialData(role, data) {
    // 1. Parsing de distancia: "DIST:X" o "Distancia: X cm" / "Distancia: X"
    if (data.startsWith('DIST:')) {
      const distance = parseInt(data.substring(5));
      if (!isNaN(distance) && sensorDataCallback) {
        sensorDataCallback('distance', distance, role);
      }
    } else if (data.toLowerCase().includes('distancia:')) {
      const match = data.match(/distancia:\s*(\d+)/i);
      if (match) {
        const distance = parseInt(match[1]);
        if (!isNaN(distance) && sensorDataCallback) {
          sensorDataCallback('distance', distance, role);
        }
      }
    }

    // 2. Parsing de estado de portón de garaje: "Puerta CERRADA", "Puerta ABIERTA", "GARAJE_STATE:...", "Garaje Cerrado/Abierto"
    if (data.includes('Puerta CERRADA') || data.includes('GARAJE_STATE:CLOSED') || data.includes('GARAJE_AUTO_CLOSED') || data.includes('Garaje Cerrado')) {
      if (sensorDataCallback) {
        sensorDataCallback('garaje_door', 'CLOSED', role);
      }
    } else if (data.includes('Puerta ABIERTA') || data.includes('GARAJE_STATE:OPEN') || data.includes('Garaje Abierto')) {
      if (sensorDataCallback) {
        sensorDataCallback('garaje_door', 'OPEN', role);
      }
    }

    // 3. Ejemplo de OLED/Respuesta del baño
    if (data.startsWith('BANO_STATE:')) {
      const state = data.substring(11);
      if (sensorDataCallback) {
        sensorDataCallback('bano_state', state, role);
      }
    } else if (data === 'SPA' || data === 'MANANA' || data === 'NOCHE' || data === 'OFF') {
      if (sensorDataCallback) {
        sensorDataCallback('bano_state', data, role);
      }
    }

    // 4. Parsing de clima (Temperatura y Humedad)
    if (data.startsWith('TEMP:')) {
      const temp = parseFloat(data.substring(5));
      if (!isNaN(temp) && sensorDataCallback) {
        sensorDataCallback('temp', temp, role);
      }
    }
    if (data.startsWith('HUM:')) {
      const hum = parseFloat(data.substring(4));
      if (!isNaN(hum) && sensorDataCallback) {
        sensorDataCallback('humidity', hum, role);
      }
    }

    // 5. Parsing de sensor de gas MQ
    if (data.startsWith('GAS:')) {
      const gas = parseInt(data.substring(4));
      if (!isNaN(gas) && sensorDataCallback) {
        sensorDataCallback('gas', gas, role);
      }
    }

    // 6. Parsing de sensor de fuego
    if (data.startsWith('FIRE:')) {
      const fire = parseInt(data.substring(5));
      if (!isNaN(fire) && sensorDataCallback) {
        sensorDataCallback('fire', fire, role);
      }
    }
  },

  // Envía logs del sistema serial directamente a la consola del Frontend
  logToFrontend(message) {
    if (ioInstance) {
      ioInstance.emit('system_log', {
        timestamp: new Date().toISOString(),
        source: 'SERVER_SERIAL',
        message
      });
    }
  },

  // Emitir evento de comando TX / RX
  emitSerialDataEvent(role, type, data) {
    if (ioInstance) {
      ioInstance.emit('serial_traffic', {
        timestamp: new Date().toISOString(),
        role,
        type, // 'tx' o 'rx'
        data
      });
    }
  },

  // Emitir actualizaciones de conexiones seriales a todos los clientes
  emitStatusUpdate() {
    if (!ioInstance) return;

    const statuses = {};
    for (const role in activeConnections) {
      statuses[role] = {
        status: activeConnections[role].status,
        path: activeConnections[role].path
      };
    }
    ioInstance.emit('serial_connections_status', statuses);
  },

  // Simulación de telemetría periódica (Deshabilitada por petición del usuario)
  startMockTelemetry() {
    // No-op: Solo se admiten entradas seriales reales
  },

  // Helper para simulación
  emitMockSensorData(type, value) {
    if (ioInstance) {
      ioInstance.emit('sensor_data', { type, value });
    }
  },

  getConnectionStatus() {
    const statuses = {};
    for (const role in activeConnections) {
      statuses[role] = {
        status: activeConnections[role].status,
        path: activeConnections[role].path
      };
    }
    return statuses;
  }
};

module.exports = serialManager;
