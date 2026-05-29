# Detección de carro con YOLOv8 (cámara del iPhone)

Modo **solo detección**: reconoce el carro y lo muestra en una ventana + en el dashboard.
**No mueve el servo ni envía nada al Arduino.**

## 1. Instalar Python
Descarga Python 3.9+ desde https://www.python.org/downloads/ y, al instalar, marca
**"Add Python to PATH"**.

Verifica en una terminal:
```
python --version
pip --version
```

## 2. Instalar dependencias
En esta carpeta (`yolo/`):
```
py -m pip install -r requirements.txt
```
> En este PC, Python se ejecuta con **`py`** (no `python`). Ya está instalado.
> La primera vez descarga PyTorch y YOLO (varios cientos de MB). Ten paciencia.
> Al ejecutar el script por primera vez, también descarga el modelo `yolov8n.pt` (~6 MB).

## 3. Conectar la cámara del iPhone (elige UNA opción)

### Opción A — Cámara virtual (la más fácil)
1. Instala en el iPhone **"Iriun Webcam"** (o **"DroidCam"**).
2. Instala el programa de escritorio de Iriun/DroidCam en Windows: https://iriun.com
3. Abre ambos (misma WiFi). Aparece una **cámara virtual** en el PC.
4. En `yolo_garage.py`, deja:
   ```python
   CAMERA_SOURCE = 1   # si no funciona, prueba 0
   ```

### Opción B — Stream RTSP
1. Instala en el iPhone **"IP Camera Lite"** (gratis) e inicia el servidor.
2. Te muestra una URL RTSP (algo como `rtsp://192.168.1.50:8554/live`).
3. En `yolo_garage.py`, pon esa URL:
   ```python
   CAMERA_SOURCE = "rtsp://192.168.1.50:8554/live"
   ```
   (El iPhone y el PC deben estar en la **misma red WiFi**.)

## 4. Ejecutar
1. (Opcional, para verlo en el dashboard) ten corriendo el servidor Node:
   ```
   cd ../server
   node server.js
   ```
2. Corre la detección:
   ```
   py yolo_garage.py
   ```
3. Apunta la cámara del iPhone hacia el carro. Verás un recuadro verde sobre el carro
   y el texto **"CARRO DETECTADO"**. En el dashboard, la tarjeta del Garaje mostrará
   un indicador **"Carro detectado (YOLO)"**.
4. Presiona **`q`** en la ventana para salir.

## Ajustes (en `yolo_garage.py`)
- `CONFIDENCE` — sube si hay falsos positivos (ej. 0.6), baja si no detecta (ej. 0.4).
- `FRAMES_PARA_DETECTAR` / `FRAMES_PARA_SALIR` — anti-rebote.
- `ENVIAR_AL_DASHBOARD = False` — si solo quieres la ventana local, sin servidor.
- `MOSTRAR_VIDEO = False` — si no quieres la ventana.
