# NEXUS HOME CONTROLLER

### Casa Inteligente (Domotica) controlada por voz, sensores y vision artificial

Proyecto de sistemas embebidos: una maqueta de casa inteligente donde los sensores reales se visualizan en una pagina web (dashboard) en tiempo real, permitiendo controlar actuadores mediante clics o comandos de voz por microfono, complementado con una camara y un modelo de inteligencia artificial (YOLO) para el reconocimiento del vehiculo en el garaje.

---

## 1. Descripcion del Proyecto

El sistema representa una maqueta habitacional dividida en cinco zonas principales: bano, cocina, habitacion, sala y garaje. Cada zona cuenta con componentes electronicos reales (luces, pantallas, sensores de temperatura, gas, fuego, distancia y servomotores) gestionados por tres placas Arduino Uno que operan en paralelo y estan conectadas por USB a una computadora.

Un servidor local centraliza las comunicaciones: lee las tramas de datos recibidas por puerto serial desde los Arduinos y las transmite de manera bidireccional y en tiempo real a una aplicacion web interactiva, permitiendo tanto la monitorizacion como el control manual y por voz.

```
+--------------------+      +--------------------+      +--------------------+      +--------------------+
|  Sensores/Actores  | <--> |   Placas Arduino   | <--> |   Servidor Local   | <--> |    Cliente Web     |
|   (Fisicos/Maqueta)|      |     (Uno x3)       |      |     (Node.js)      |      |   (React Dashboard)|
+--------------------+      +--------------------+      +--------------------+      +--------------------+
                                                                   ^
                                                                   |
                                                        +--------------------+
                                                        |  Camara + IA/YOLO  |
                                                        |  (Deteccion Carro) |
                                                        +--------------------+
```

---

## 2. Componentes de Hardware Utilizados

### Placas y Conectividad
* **Arduino Uno (x3)**: Microcontroladores que actuan como procesadores dedicados para cada zona fisica.
* **Protoboards (x3)**: Placas de prueba para la interconexion de la electronica sin soldadura.
* **Cables de conexion y resistencias**: Elementos de cableado y proteccion electrica.

### Actuadores y Motores
* **Servomotor de Porton (Garaje)**: Motor de rotacion limitada a angulo de 0 a 90 grados para apertura y cierre del porton.
* **Servomotor de Persiana (Habitacion)**: Motor de rotacion continua de 360 grados, configurado para girar en una direccion u otra por un intervalo de tiempo.

### Iluminacion (LEDs)
* **LED RGB del Bano**: Diodo emisor de luz multicolor para indicar los modos Spa (Rojo), Manana (Azul), Noche (Verde) o Apagado.
* **LED RGB de la Cocina**: Indicador de estado de nevera (Azul), iluminacion general (Verde) o estufa (Cyan).

### Sensores y Detectores
* **Sensor Ultrasonico HC-SR04**: Emisor y receptor de ultrasonido que funciona como radar para medir la distancia del automovil.
* **Sensor de Clima DHT11**: Sensor digital de temperatura y humedad ambiental.
* **Sensor de Gas MQ**: Sensor analogico para detectar la concentracion y fugas de gas.
* **Sensor de Fuego**: Detector digital de flama y radiacion para la prevencion de incendios.

### Interfaces Visuales y Sonoras
* **Pantallas OLED SSD1306 (128x64, I2C)**: Displays graficos colocados directamente en la maqueta para mostrar estados en vivo.
* **Buzzer (Zumbador)**: Dispositivo sonoro de alarma activado ante eventos criticos de gas o fuego.

### Entrada de Video (IA)
* **Camara Movil**: Camara de telefono celular configurada como dispositivo de video IP para alimentar el modelo de vision por computadora.

---

## 3. Distribucion de Módulos (Arduinos)

El sistema distribuye la logica en tres placas fisicas independientes conectadas simultaneamente a la PC mediante puertos COM individuales.

| Placa | Modulo Habitacional | Componentes Electronicos Asociados |
| :--- | :--- | :--- |
| **Arduino 1** | Bano y Garaje | LED RGB, Pantalla OLED I2C, Servomotor de Porton, Sensor Ultrasonico HC-SR04 |
| **Arduino 2** | Cocina y Habitacion | Sensor DHT11, LED RGB (Anodo Comun), Sensor de Gas MQ, Sensor de Fuego, Buzzer, Servomotor de Persiana 360, Pantalla OLED I2C |
| **Arduino 3** | Sala | Actuadores y emuladores de aparatos multimedia (TV, Piano, Mini-juego) |

### Logica de Ejecucion No Bloqueante
Para evitar congelamientos y retardos en el procesamiento, los programas de los Arduinos estan disenados de forma no bloqueante (utilizando `millis()` en lugar de `delay()` para los sensores). Esto les permite ejecutar dos flujos simultaneamente:
1. Envio periodico de datos seriales con las lecturas de los sensores al servidor.
2. Escucha constante de comandos seriales entrantes para activar dispositivos de forma inmediata.

---

## 4. Protocolo de Comunicacion Serial

La comunicacion se realiza por puerto serie USB configurado a una velocidad de **9600 baudios**.

### Tramas enviadas desde los Arduinos al Servidor
* `DIST:X` (Distancia medida en centimetros por el radar del garaje)
* `TEMP:X.XX` (Temperatura medida en grados Celsius)
* `HUM:X.XX` (Porcentaje de humedad relativa)
* `GAS:X` (Lectura analogica del sensor de gas MQ)
* `FIRE:X` (Lectura digital del sensor de fuego: 0 si esta seguro, 1 si hay fuego)

### Comandos enviados desde el Servidor a los Arduinos
* **Bano**: `SPA`, `MANANA`, `NOCHE`, `OFF` (Configuracion de modos e iluminacion)
* **Garaje**: `ABRIR`, `CERRAR` (Control del porton del garaje)
* **Cocina**: `nevera`, `cocina`, `estufa`, `off` (Control de iluminacion e indicadores RGB de cocina)
* **Habitacion**: `ABRIR_PERSIANA`, `CERRAR_PERSIANA` (Apertura y cierre temporizado de persianas)

---

## 5. Arquitectura del Servidor Local (Backend)

Construido en Node.js, actua como el nucleo logico de la instalacion:
* **Conexion de Puertos COM**: Abre y monitorea los flujos seriales de las placas de forma paralela.
* **Parser de Datos**: Traduce las tramas de texto de los Arduinos en un estado JavaScript consolidado.
* **Persistencia local**: Almacena el ultimo estado conocido y un registro de eventos recientes en archivos estructurados JSON (`db_state.json` y `db_logs.json`).
* **Comunicacion por Sockets**: Distribuye de forma instantanea las actualizaciones a todos los clientes web conectados utilizando WebSockets y gestiona comandos procedentes del navegador.

### Tecnologias Backend
* **Node.js** y **Express** como entorno y enrutador base.
* **Socket.IO** para el flujo bidireccional de datos en tiempo real.
* **serialport** para la interaccion nativa con los puertos serie USB.

---

## 6. Interfaz Web (Frontend)

El dashboard web permite visualizar de forma dinamica el estado de la vivienda:
* **Visualizacion en vivo**: Muestra graficas de radar para la distancia del auto, niveles de gas y fuego, pantallas OLED y datos de clima.
* **Control Manual**: Botones interactivos que envian comandos directos a los actuadores.
* **Logs del sistema**: Consola en tiempo real de los comandos ejecutados y el trafico de datos RX/TX.

### Tecnologias Frontend
* **React** como biblioteca para la construccion de componentes reutilizables.
* **Vite** para la compilacion y ejecucion optimizada de desarrollo.
* **TailwindCSS** para el diseno responsive y la estetica visual oscura.
* **Framer Motion** para animaciones fluidas e interactivas.
* **Lucide React** para la iconografia.

---

## 7. Asistente de Voz Integrado

El sistema incorpora un control de voz que procesa peticiones en espanol utilizando el motor de audio nativo del navegador (Web Speech API).

### Flujo de Ejecucion
1. El usuario activa la escucha presionando el control central en la pantalla.
2. `SpeechRecognition` convierte el audio en texto plano.
3. Un comparador linguistico mapea el texto con intenciones del sistema.
4. Se ejecuta el comando correspondiente via WebSocket.
5. El sistema responde con voz sintetica utilizando `SpeechSynthesis` en espanol (es-CO).

### Comandos de Voz Admitidos
* **Bano**: "activar modo spa", "activar modo mañana", "activar modo noche", "apagar baño".
* **Cocina**: "encender nevera", "encender luz cocina", "encender estufa".
* **Habitacion**: "subir persiana", "bajar persiana".
* **Garaje**: "abrir garaje", "cerrar garaje".
* **Apagado General**: "apagar" o "apagar todo" (Desactiva todas las luces y sistemas de la casa).

---

## 8. Deteccion de Vehiculo con Vision Artificial (YOLO)

El garaje inteligente cuenta con una camara IP que alimenta un script de Python encargado del procesamiento de imagenes.

### Caracteristicas
* **Modelo de IA**: Utiliza YOLOv8 (You Only Look Once) entrenado para el reconocimiento de automoviles.
* **Procesamiento**: OpenCV recibe el stream de video de la camara, aplica la red neuronal, dibuja los recuadros de deteccion y transmite el video optimizado al dashboard.
* **Sincronizacion**: Emite una senal de socket ("carro detectado / no detectado") al servidor de Node.js para actualizar graficamente el panel web.

> [!NOTE]
> En la version actual, la deteccion por camara tiene fines puramente informativos y de visualizacion; el control automatico del porton sigue dependiendo del sensor ultrasonico del Arduino.

### Tecnologias de IA
* **Python**
* **YOLOv8 (Ultralytics)**
* **OpenCV**
* **Flask** (para la transmision HTTP de video)
* **python-socketio** (para integracion de sockets con Node.js)

---

## 9. Guia de Ejecucion del Proyecto

Sigue estos pasos en orden para arrancar el sistema completo:

### Paso 1: Cargar codigos de Arduino
Abre tu Arduino IDE y sube el codigo correspondiente a cada placa:
* **Arduino 1**: `arduinos/Arduino1_Bano_Garaje/Arduino1_Bano_Garaje.ino`
* **Arduino 2**: `arduinos/Arduino2_Cocina_Habitacion/Arduino2_Cocina_Habitacion.ino`
* **Arduino 3**: Carga el programa dedicado de la sala.

### Paso 2: Ejecutar el Servidor Backend
Abre una terminal en la raiz y ejecuta:
```bash
cd server
npm install
node server.js
```
El servidor estara escuchando en `http://localhost:5000`.

### Paso 3: Ejecutar el Panel Web
Abre una nueva terminal y ejecuta:
```bash
cd client
npm install
npm run dev
```
Abre en tu navegador la direccion indicada (usualmente `http://localhost:5173`). Desde el panel "Hardware Conector", haz clic en conectar en los puertos COM de cada Arduino.

> [!WARNING]
> No dejes abierto el Monitor Serie de Arduino IDE al conectar los puertos en la web, ya que el puerto serie solo admite una aplicacion conectada a la vez.

### Paso 4: Ejecutar la Deteccion YOLO (Opcional)
Abre una tercera terminal y ejecuta:
```bash
cd yolo
python -m pip install -r requirements.txt
python yolo_garage.py
```
*Para conectar la camara del telefono, utiliza herramientas como Iriun Webcam o streams RTSP, ajustando la URL del video en `yolo_garage.py`.*

---

## 10. Estructura de Directorios

```
Proyecto-Embebidos/
├── arduinos/                # Archivos de codigo (.ino) para placas Arduino
│   ├── Arduino1_Bano_Garaje/
│   ├── Arduino2_Cocina_Habitacion/
│   └── ...
├── server/                  # Codigo backend (Node.js, Express, Sockets, Serial)
├── client/                  # Codigo frontend de la aplicacion (React, Vite, CSS)
├── yolo/                    # Script de vision artificial YOLO (Python) y camara
├── README.md                # Descripcion general estructurada (este archivo)
└── DOCUMENTACION.txt        # Documentacion original en texto plano
```

---

<p align="center">Proyecto academico de domotica - Sistemas Embebidos</p>
