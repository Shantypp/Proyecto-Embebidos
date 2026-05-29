# 🏠 NEXUS HOME CONTROLLER

### Casa inteligente (domótica) controlada por **voz**, **sensores** y **cámara con IA**

Proyecto de **sistemas embebidos**: una maqueta de casa inteligente donde los
sensores reales se ven en una página web en tiempo real, se puede controlar todo
con clics o **hablando por micrófono**, y una cámara con **inteligencia artificial
(YOLO)** reconoce el carro del garaje.

---

## 📖 ¿Qué hace el proyecto? (explicación sencilla)

Imagina una casa de juguete dividida en cuartos: **baño, cocina, habitación, sala
y garaje**. Cada cuarto tiene cositas reales: luces de colores, una pantalla,
sensores de temperatura, de gas, de fuego, un sensor de distancia, motores que
abren puertas y persianas, etc.

Todo eso lo controlan unas placas **Arduino** conectadas por USB al computador.
En el computador corre un **servidor** que lee todo el tiempo lo que mandan los
Arduinos y lo envía a una **página web** (el tablero). Desde ahí ves los datos en
vivo y controlas la casa con botones o con la voz. Además, una **cámara con IA**
detecta cuando hay un carro en el garaje.

```
  SENSORES Y MOTORES  <-->  ARDUINOS  <-->  SERVIDOR (PC)  <-->  PÁGINA WEB
                                                  ▲
                                                  │
                                        CÁMARA + YOLO (carro)
```

---

## 🔩 Partes físicas que usamos

### Placas y base
| Componente | Para qué sirve |
|---|---|
| 3 × Arduino UNO | El "cerebro" de cada zona de la casa |
| 3 × Protoboard (una por Arduino) | Armar los circuitos sin soldar |
| Cables y resistencias | Conectar todo |

### Motores
| Componente | Para qué sirve |
|---|---|
| Servomotor del **garaje** | Abre y cierra el portón |
| Servomotor de la **persiana** | Rotación continua; sube/baja la persiana |

### Luces (LEDs)
| Componente | Para qué sirve |
|---|---|
| LED RGB del **baño** | Cambia de color según el modo (Spa, Mañana, Noche) |
| LED RGB de la **cocina** | Indica nevera, luz y estufa con colores |

### Sensores / detectores
| Componente | Para qué sirve |
|---|---|
| Ultrasónico **HC-SR04** | "Radar" del garaje: mide la distancia del carro |
| **DHT11** | Mide temperatura y humedad |
| Sensor de **gas (MQ)** | Detecta fugas de gas en la cocina |
| Sensor de **fuego/llama** | Detecta incendio en la cocina |

### Pantallas y alarma
| Componente | Para qué sirve |
|---|---|
| Pantallas **OLED SSD1306** (128×64, I2C) | Muestran info en la maqueta |
| **Buzzer** | Suena ante gas o fuego |
| **Cámara del iPhone** | "Ojo" para que YOLO reconozca el carro |

---

## 🧩 ¿Cómo están implementados los 3 Arduinos?

La casa se reparte en **3 placas Arduino**, cada una con **su propia protoboard**,
y **las 3 funcionan al mismo tiempo**. Cada una está conectada por su propio cable
USB (cada Arduino usa un **puerto COM** distinto).

| Arduino | Zona | Componentes |
|---|---|---|
| **Arduino 1** | Baño + Garaje | LED RGB + OLED + servo del portón + sensor ultrasónico |
| **Arduino 2** | Cocina + Habitación | DHT11 + LED RGB + sensor de gas + sensor de fuego + buzzer + servo persiana + OLED |
| **Arduino 3** | Sala | Aparatos de la sala (TV, piano, mini-juego…) |

**¿Cómo trabajan juntos?**
- Cada Arduino hace dos cosas a la vez sin trabarse (programación *no bloqueante*):
  1. Enviar continuamente la info de sus sensores por USB.
  2. Escuchar las órdenes que llegan desde el computador.
- Se comunican con el PC por **puerto serial USB a 9600 baudios**, usando mensajes
  cortos de texto.

**Ejemplos de mensajes** que envía el Arduino:
```
DIST:23      → 23 cm en el radar del garaje
TEMP:25.30   → temperatura 25.3 °C
HUM:64.80    → humedad 64.8 %
GAS:120      → nivel de gas
FIRE:0       → 0 = sin fuego, 1 = fuego
```
**Órdenes** que envía el computador:
```
SPA / MANANA / NOCHE / OFF          → modos del baño
ABRIR / CERRAR                      → portón del garaje
nevera / cocina / estufa            → cocina
ABRIR_PERSIANA / CERRAR_PERSIANA    → habitación
```

---

## 🧠 El cerebro central: el servidor

Un programa en **Node.js** que hace de puente entre los Arduinos y la web:
- Lee los puertos COM de los 3 Arduinos al mismo tiempo.
- Interpreta los mensajes y arma el "estado de la casa".
- Guarda el estado y un historial de eventos en archivos **JSON**.
- Envía todo a la web **en tiempo real** y reenvía las órdenes al Arduino correcto.

---

## 🖥️ La página web (dashboard) y 🎙️ la voz y 🤖 la cámara

- **Dashboard:** tarjetas por cuarto, sensores en vivo, consola de voz, historial
  y estado de los puertos.
- **Voz:** haces clic en el orbe, hablas, la casa ejecuta y te responde hablando.
  Usa la **Web Speech API** del navegador, en español.
- **Cámara IA (YOLO):** la cámara del celular detecta el carro y dibuja un recuadro;
  el video y el aviso "carro detectado" se ven en el tablero.
  *(En esta versión la cámara solo detecta e informa; no mueve el motor del garaje.)*

---

## 🛠️ Tecnologías usadas

| Área | Tecnologías |
|---|---|
| **Hardware** | Arduino UNO ×3, protoboards, servomotores, LEDs RGB, HC-SR04, DHT11, sensor de gas (MQ), sensor de fuego, buzzer, OLED SSD1306 |
| **Arduinos** | C/C++ (Arduino IDE) · librerías `Servo`, `Adafruit_SSD1306`, `Adafruit_GFX`, `DHT`, `Wire` |
| **Servidor** | Node.js · Express · Socket.IO · serialport · almacenamiento JSON |
| **Página web** | React · Vite · TailwindCSS · Framer Motion · lucide-react · Socket.IO (cliente) |
| **Voz** | Web Speech API (reconocimiento + síntesis de voz), en español |
| **IA / Cámara** | Python · YOLOv8 (Ultralytics) · OpenCV · Flask · python-socketio |

---

## ▶️ Cómo ejecutar el proyecto

**1. Subir los programas a los Arduinos** (desde el Arduino IDE):
- `arduinos/Arduino1_Bano_Garaje/Arduino1_Bano_Garaje.ino`
- `arduinos/Arduino2_Cocina_Habitacion/Arduino2_Cocina_Habitacion.ino`
- El programa de la sala (Arduino 3).

**2. Encender el servidor:**
```bash
cd server
npm install      # solo la primera vez
node server.js
```

**3. Encender la página web:**
```bash
cd client
npm install      # solo la primera vez
npm run dev      # abre la dirección que muestre, p. ej. http://localhost:5173
```

**4. Conectar los Arduinos** en el tablero (panel *Hardware Conector*), cada uno a
su puerto COM.
> ⚠️ El Monitor Serie del Arduino IDE y el tablero **no pueden usar el mismo puerto
> al mismo tiempo**.

**5. (Opcional) Detección del carro con la cámara:**
```bash
cd yolo
py -m pip install -r requirements.txt   # solo la primera vez
py yolo_garage.py
```
> Más detalles en [`yolo/README.md`](yolo/README.md).

---

## 📁 Estructura del proyecto

```
Proyecto-Embebidos/
├── arduinos/   → programas (.ino) de cada Arduino
├── server/     → servidor Node.js (lee los Arduinos y habla con la web)
├── client/     → página web (dashboard) en React
├── yolo/       → detección del carro con YOLO (Python) + README
├── README.md           → este archivo
└── DOCUMENTACION.txt    → la misma explicación en texto plano
```

---

<p align="center">Proyecto académico de domótica · Sistemas Embebidos</p>
