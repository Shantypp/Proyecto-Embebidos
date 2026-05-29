const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const portPath = 'COM5';
console.log(`Abriendo puerto ${portPath}...`);

try {
  const port = new SerialPort({
    path: portPath,
    baudRate: 9600,
    autoOpen: true
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  port.on('open', () => {
    console.log(`¡Puerto ${portPath} abierto con éxito! Esperando datos por 3 segundos...`);
    
    // Auto-cerrar después de 3 segundos
    setTimeout(() => {
      console.log('Finalizando diagnóstico...');
      port.close();
      process.exit(0);
    }, 3000);
  });

  parser.on('data', (data) => {
    console.log(`[RAW COM5] -> "${data.toString().trim()}"`);
  });

  port.on('error', (err) => {
    console.error('Error en puerto:', err.message);
    process.exit(1);
  });

} catch (error) {
  console.error('Excepción al abrir puerto:', error.message);
}
