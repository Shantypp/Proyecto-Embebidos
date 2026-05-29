/**
 * Arduino 3: Control de Habitación y Garaje Inteligente
 * Proyecto de Domótica por Voz - Universidad
 * 
 * Conexiones Sugeridas:
 * - Habitación: Luces -> Pin 3 (Relé o LED)
 * - Habitación: Servo Persiana -> Pin 6 (Servo)
 * - Garaje: Servo Portón -> Pin 9 (Servo)
 * - Garaje: Sensor Ultrasonido HC-SR04 (Trigger -> Pin 11, Echo -> Pin 12)
 */

#include <Servo.h>

// Sensor de Ultrasonido HC-SR04
const int PIN_TRIGGER = 11;
const int PIN_ECHO = 12;

// Servomotores
const int PIN_SERVO_PERSIANA = 6;
const int PIN_SERVO_PORTON = 9;

// Iluminación
const int PIN_LUCES_HABITACION = 3;

Servo servoPersiana;
Servo servoPorton;

// Variables de estado
String inputBuffer = "";
unsigned long ultimoSensorCheck = 0;
const unsigned long INTERVALO_SENSOR = 1000; // Leer distancia cada 1 segundo

// Configuración de ángulos para los servos
const int ANGULO_PORTON_CERRADO = 0;
const int ANGULO_PORTON_ABIERTO = 90;
const int ANGULO_PERSIANA_CERRADA = 0;
const int ANGULO_PERSIANA_ABIERTA = 180;

bool portonAbierto = false;

void setup() {
  Serial.begin(9600);
  
  // Configurar Pines Digitales
  pinMode(PIN_LUCES_HABITACION, OUTPUT);
  pinMode(PIN_TRIGGER, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  
  // Inicializar Servos
  servoPersiana.attach(PIN_SERVO_PERSIANA);
  servoPorton.attach(PIN_SERVO_PORTON);
  
  // Estado Inicial
  digitalWrite(PIN_LUCES_HABITACION, HIGH); // Encendido por defecto
  servoPersiana.write(ANGULO_PERSIANA_ABIERTA); // Persiana abierta al inicio (180 grados)
  servoPorton.write(ANGULO_PORTON_CERRADO); // Portón del garaje cerrado
  portonAbierto = false;
  
  Serial.println("ARDUINO_3: READY (Habitacion + Garaje)");
}

void loop() {
  // 1. Escuchar Comandos Seriales
  while (Serial.available() > 0) {
    char inChar = (char)Serial.read();
    if (inChar == '\n' || inChar == '\r') {
      inputBuffer.trim();
      if (inputBuffer.length() > 0) {
        processCommand(inputBuffer);
      }
      inputBuffer = "";
    } else {
      inputBuffer += inChar;
    }
  }
  
  // 2. Leer Sensor de Ultrasonido periódicamente
  unsigned long currentMillis = millis();
  if (currentMillis - ultimoSensorCheck >= INTERVALO_SENSOR) {
    ultimoSensorCheck = currentMillis;
    
    long distancia = medirDistancia();
    
    // Imprimir telemetría en puerto serial (el servidor la leerá en tiempo real)
    Serial.print("DIST:");
    Serial.println(distancia);
    
    // Regla de Seguridad Automatizada Local (en el Arduino):
    // Si la puerta del garaje está abierta y se detecta un objeto a menos de 5 cm, se cierra sola.
    if (portonAbierto && distancia > 0 && distancia < 5) {
      servoPorton.write(ANGULO_PORTON_CERRADO);
      portonAbierto = false;
      Serial.println("GARAJE_AUTO_CLOSED");
      Serial.println("DIST:20"); // Enviar distancia por defecto segura tras cerrar
    }
  }
}

// Mide la distancia en centímetros usando el HC-SR04
long medirDistancia() {
  digitalWrite(PIN_TRIGGER, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIGGER, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIGGER, LOW);
  
  long duracion = pulseIn(PIN_ECHO, HIGH, 30000); // 30ms timeout (aprox 5 metros máx)
  
  if (duracion == 0) {
    return -1; // Fuera de rango o error
  }
  
  // Distancia en cm: velocidad del sonido = 340m/s -> 29 microsegundos por cm. Ida y vuelta -> / 29 / 2
  return duracion / 29 / 2;
}

// Procesar comandos entrantes
void processCommand(String cmd) {
  // --- COMANDOS HABITACIÓN ---
  if (cmd.equals("APAGAR_HABITACION")) {
    digitalWrite(PIN_LUCES_HABITACION, LOW);
    Serial.println("HABITACION_STATE:LIGHTS_OFF");
  } 
  else if (cmd.equals("ENCENDER_HABITACION")) {
    digitalWrite(PIN_LUCES_HABITACION, HIGH);
    Serial.println("HABITACION_STATE:LIGHTS_ON");
  }
  else if (cmd.equals("SUBIR_PERSIANA")) {
    // Abrir persianas (servo a 180)
    servoPersiana.write(ANGULO_PERSIANA_ABIERTA);
    Serial.println("HABITACION_STATE:BLINDS_OPEN");
  }
  else if (cmd.equals("BAJAR_PERSIANA")) {
    // Cerrar persianas (servo a 0)
    servoPersiana.write(ANGULO_PERSIANA_CERRADA);
    Serial.println("HABITACION_STATE:BLINDS_CLOSED");
  }
  
  // --- COMANDOS GARAJE ---
  else if (cmd.equals("ABRIR")) {
    servoPorton.write(ANGULO_PORTON_ABIERTO);
    portonAbierto = true;
    Serial.println("GARAJE_STATE:OPEN");
  }
  else if (cmd.equals("CERRAR")) {
    servoPorton.write(ANGULO_PORTON_CERRADO);
    portonAbierto = false;
    Serial.println("GARAJE_STATE:CLOSED");
  }
}
