const fs = require('fs');
const path = require('path');

const LOGS_FILE = path.join(__dirname, 'db_logs.json');
const STATE_FILE = path.join(__dirname, 'db_state.json');
const GARAGE_LOGS_FILE = path.join(__dirname, 'db_garage_logs.json');

// Base de datos local simulada basada en archivos
function readJSON(file, defaultData) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const content = fs.readFileSync(file, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error leyendo base de datos local (${file}):`, error);
    return defaultData;
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error escribiendo en base de datos local (${file}):`, error);
  }
}

// Configuración opcional para MongoDB y Firebase
// Descomentar e instalar dependencias correspondientes para usarlas en producción
/*
// ESTRUCTURA MONGODB (Mongoose)
// const mongoose = require('mongoose');
// const logSchema = new mongoose.Schema({
//   timestamp: { type: Date, default: Date.now },
//   command: String,
//   intent: String,
//   module: String,
//   status: String,
//   arduinoResponse: String
// });
// const Log = mongoose.model('Log', logSchema);

// ESTRUCTURA FIREBASE (firebase-admin)
// const admin = require('firebase-admin');
// const serviceAccount = require('./path-to-firebase-key.json');
// admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
// const firestore = admin.firestore();
*/

const db = {
  dbType: 'Local JSON Fallback',

  async connect() {
    console.log('\x1b[36m%s\x1b[0m', '===============================================');
    console.log('\x1b[36m%s\x1b[0m', '   INICIALIZANDO CONEXIÓN A BASE DE DATOS...   ');
    
    // Aquí se conectaría a MongoDB o Firebase:
    // Ex. MongoDB: await mongoose.connect('mongodb://localhost:27017/domotica');
    
    console.log('\x1b[32m%s\x1b[0m', `   [BD] Conectado exitosamente en modo: ${this.dbType}`);
    console.log('\x1b[36m%s\x1b[0m', '===============================================');
    return true;
  },

  // Registrar comando ejecutado
  async logCommand(command, intent, module, status = 'success', response = '') {
    const timestamp = new Date().toISOString();
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      command,
      intent,
      module,
      status,
      response
    };

    console.log(`[BD LOG] Guardando comando: "${command}" -> Intención: "${intent}" en módulo "${module}"`);

    // Guardar en archivo local
    const logs = readJSON(LOGS_FILE, []);
    logs.unshift(newLog); // Añadir al inicio para ver los últimos primero
    
    // Limitar logs históricos a 100 para no saturar disco local
    if (logs.length > 100) logs.pop();
    
    writeJSON(LOGS_FILE, logs);

    // Integración de Firebase Firestore en producción:
    // await firestore.collection('logs').add(newLog);

    // Integración de MongoDB en producción:
    // const dbLog = new Log(newLog);
    // await dbLog.save();

    return newLog;
  },

  // Obtener logs de comandos
  async getLogs(limit = 20) {
    const logs = readJSON(LOGS_FILE, []);
    return logs.slice(0, limit);
  },

  // Registrar logs de acceso de garaje
  async logGarageAccess(action, distance) {
    const timestamp = new Date().toISOString();
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      action, // 'OPEN' o 'CLOSED'
      distance
    };

    console.log(`[BD LOG] Registro de Garaje: Portón ${action} | Distancia: ${distance}cm`);

    const logs = readJSON(GARAGE_LOGS_FILE, []);
    logs.unshift(newLog);
    
    if (logs.length > 50) logs.pop();
    
    writeJSON(GARAGE_LOGS_FILE, logs);
    return newLog;
  },

  // Obtener logs de garaje
  async getGarageAccessLogs(limit = 20) {
    const logs = readJSON(GARAGE_LOGS_FILE, []);
    return logs.slice(0, limit);
  },

  // Guardar estado de la casa
  async saveHomeState(state) {
    writeJSON(STATE_FILE, state);
    return state;
  },

  // Obtener último estado guardado
  async getHomeState() {
    const defaultState = {
      bano: { rgbColor: '#00f0ff', mode: 'MANANA', state: 'ON' },
      cocina: { lights: false, stove: false, fan: false, fridge: true, nevera: false, gasLevel: 120, gasAlert: false, fireAlert: false, temp: 24.0, humidity: 50.0 },
      sala: { tv: false, piano: false, game: false, gameScore: 0 },
      habitacion: { lights: false, blinds: 0, temp: 24.0, humidity: 50.0 },
      garaje: { door: 'CLOSED', distance: 10, autoCloseActive: false }
    };
    return readJSON(STATE_FILE, defaultState);
  }
};

module.exports = db;
