"""
Deteccion de carro con YOLOv8 usando la camara del iPhone.
MODO SOLO-DETECCION: NO mueve el servo ni envia comandos al Arduino.

Ademas SIRVE EL VIDEO (con los recuadros) en una URL para verlo en el dashboard:
    http://localhost:8090/video_feed   (stream MJPEG)

------------------------------------------------------------------
CAMARA DEL IPHONE (elige UNA opcion):

OPCION A (mas facil) - Camara virtual:
  App "Iriun Webcam" (o "DroidCam") en el iPhone + su programa de Windows.
  Crea una camara virtual. Aqui usa un numero:
      CAMERA_SOURCE = 1     (prueba 0 si 1 no funciona)

OPCION B - Stream RTSP:
  App "IP Camera Lite" en el iPhone -> URL RTSP. Aqui usa esa cadena:
      CAMERA_SOURCE = "rtsp://192.168.1.50:8554/live"
------------------------------------------------------------------

USO:
  1. py -m pip install -r requirements.txt
  2. Conecta la camara del iPhone y ajusta CAMERA_SOURCE abajo.
  3. (Opcional) ten corriendo el servidor Node para el indicador del dashboard.
  4. py yolo_garage.py     ('q' en la ventana para salir)
"""

import time
import threading
import cv2
from ultralytics import YOLO
import socketio
from flask import Flask, Response

# ============================================================
# CONFIGURACION
# ============================================================

CAMERA_SOURCE = 1                      # 1/0 (camara virtual) o "rtsp://..." (RTSP)

SERVER_URL = "http://localhost:5000"   # servidor Node (indicador en el dashboard)
ENVIAR_AL_DASHBOARD = True

MODEL = "yolov8s.pt"                   # 's' mas preciso que 'n'. Prueba "yolov8m.pt" si falla.
CONFIDENCE = 0.30                      # confianza minima (baja si no detecta)

# Clases de vehiculo en COCO: 2=car, 5=bus, 7=truck
VEHICLE_CLASSES = {2: "car", 5: "bus", 7: "truck"}

FRAMES_PARA_DETECTAR = 5
FRAMES_PARA_SALIR = 15

MOSTRAR_VIDEO = True                   # ventana local opcional ('q' para salir)

# --- Video para el dashboard ---
SERVIR_EN_WEB = True                   # publica el video en http://localhost:WEB_PORT/video_feed
WEB_PORT = 8090

# Diagnostico (dibuja/imprime TODO lo que ve). Dejar en False para ver solo el carro.
DEBUG_VER_TODO = False
DEBUG_CONF = 0.25

# ============================================================

sio = socketio.Client(reconnection=True)

# Ultimo frame anotado (JPEG) compartido con el servidor web
ultimo_jpeg = None
lock = threading.Lock()

app = Flask(__name__)


@app.route("/video_feed")
def video_feed():
    def gen():
        while True:
            with lock:
                f = ultimo_jpeg
            if f is not None:
                yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + f + b"\r\n")
            time.sleep(0.04)
    return Response(gen(), mimetype="multipart/x-mixed-replace; boundary=frame")


@app.route("/")
def index():
    return '<html><body style="margin:0;background:#000">' \
           '<img src="/video_feed" style="width:100%"></body></html>'


def iniciar_web():
    # Servidor web local para el stream MJPEG
    app.run(host="0.0.0.0", port=WEB_PORT, threaded=True, debug=False, use_reloader=False)


@sio.event
def connect():
    print("[YOLO] Conectado al dashboard:", SERVER_URL)


@sio.event
def disconnect():
    print("[YOLO] Desconectado del dashboard")


def avisar_dashboard(detectado, confianza):
    """Solo informa el estado de deteccion (NO toca el Arduino)."""
    if ENVIAR_AL_DASHBOARD and sio.connected:
        sio.emit("yolo_detection", {"detected": detectado, "confidence": round(confianza, 2)})


def main():
    global ultimo_jpeg

    print("[YOLO] Cargando modelo", MODEL, "...")
    model = YOLO(MODEL)

    if ENVIAR_AL_DASHBOARD:
        try:
            sio.connect(SERVER_URL, transports=["websocket"])
        except Exception as e:
            print("[YOLO] Aviso: sin dashboard (sigo local):", e)

    if SERVIR_EN_WEB:
        threading.Thread(target=iniciar_web, daemon=True).start()
        print(f"[YOLO] Video para el dashboard en: http://localhost:{WEB_PORT}/video_feed")

    print("[YOLO] Abriendo camara:", CAMERA_SOURCE)
    cap = cv2.VideoCapture(CAMERA_SOURCE)
    if not cap.isOpened():
        print("[YOLO] ERROR: no pude abrir la camara. Revisa CAMERA_SOURCE y la app/WiFi.")
        return

    carro_presente = False
    cont_si = 0
    cont_no = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            print("[YOLO] Frame no recibido, reintentando...")
            time.sleep(0.5)
            cap.release()
            cap = cv2.VideoCapture(CAMERA_SOURCE)
            continue

        resultados = model(frame, verbose=False)[0]

        hay_carro = False
        mejor_conf = 0.0
        debug_det = []

        for box in resultados.boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            nombre = model.names.get(cls, str(cls))
            es_vehiculo = (cls in VEHICLE_CLASSES) and (conf >= CONFIDENCE)

            if es_vehiculo:
                hay_carro = True
                mejor_conf = max(mejor_conf, conf)

            if DEBUG_VER_TODO and conf >= DEBUG_CONF:
                debug_det.append(f"{nombre}:{conf:.2f}")

            # Dibujar SOLO el carro (vehiculo). En diagnostico, tambien lo demas.
            if es_vehiculo or (DEBUG_VER_TODO and conf >= DEBUG_CONF):
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                color = (0, 255, 0) if es_vehiculo else (0, 200, 255)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, f"{nombre} {conf:.2f}",
                            (x1, max(15, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        if DEBUG_VER_TODO and debug_det:
            print("[YOLO][debug] veo:", ", ".join(debug_det))

        # Anti-rebote
        if hay_carro:
            cont_si += 1
            cont_no = 0
        else:
            cont_no += 1
            cont_si = 0

        if not carro_presente and cont_si >= FRAMES_PARA_DETECTAR:
            carro_presente = True
            print(f"[YOLO] CARRO DETECTADO (conf {mejor_conf:.2f})")
            avisar_dashboard(True, mejor_conf)
        elif carro_presente and cont_no >= FRAMES_PARA_SALIR:
            carro_presente = False
            print("[YOLO] Carro fuera de cuadro")
            avisar_dashboard(False, 0.0)

        # Texto de estado arriba
        estado = "CARRO DETECTADO" if carro_presente else "sin carro"
        color = (0, 200, 0) if carro_presente else (0, 0, 255)
        cv2.putText(frame, estado, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)

        # Publicar el frame para el dashboard (MJPEG)
        if SERVIR_EN_WEB:
            ok2, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if ok2:
                with lock:
                    ultimo_jpeg = buf.tobytes()

        if MOSTRAR_VIDEO:
            cv2.imshow("YOLO - Deteccion de carro ('q' para salir)", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    cap.release()
    cv2.destroyAllWindows()
    if sio.connected:
        sio.disconnect()


if __name__ == "__main__":
    main()
