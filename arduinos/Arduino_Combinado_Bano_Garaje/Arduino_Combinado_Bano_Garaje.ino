/**
 * Arduino Combinado: Control de Baño Inteligente y Garaje Inteligente
 * Proyecto de Domótica por Voz - Universidad
 * 
 * Este sketch permite controlar ambos módulos desde un solo Arduino UNO.
 * 
 * Conexiones Físicas:
 * - BAÑO:
 *   - LED RGB (Cátodo Común):
 *     - Pin D3 -> Resistencia 220 Ohm -> Pin Rojo LED RGB
 *     - Pin D5 -> Resistencia 220 Ohm -> Pin Verde LED RGB
 *     - Pin D6 -> Resistencia 220 Ohm -> Pin Azul LED RGB
 *     - GND -> Pin Común LED RGB
 *   - PANTALLA OLED SSD1306 I2C (128x64):
 *     - VCC -> 5V
 *     - GND -> GND
 *     - SDA -> Pin A4 de Arduino Uno
 *     - SCL -> Pin A5 de Arduino Uno
 * 
 * - GARAJE:
 *   - SERVO MOTOR SG90 (Portón):
 *     - Cable Naranja/Amarillo (Señal) -> Pin D9
 *     - Cable Rojo (VCC) -> 5V
 *     - Cable Marrón (GND) -> GND
 *   - SENSOR ULTRASONIDO HC-SR04 (Radar Proximidad):
 *     - VCC -> 5V
 *     - GND -> GND
 *     - Trigger -> Pin D11
 *     - Echo -> Pin D12
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Servo.h>

// Definiciones de Pantalla OLED I2C (Dirección habitual: 0x3C o 0x3D)
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Pines del LED RGB (Baño)
const int PIN_RED = 3;
const int PIN_GREEN = 5;
const int PIN_BLUE = 6;

// Pines del Sensor de Ultrasonido HC-SR04 (Garaje)
const int PIN_TRIGGER = 11;
const int PIN_ECHO = 12;

// Pin del Servo Portón (Garaje)
const int PIN_SERVO_PORTON = 9;
Servo servoPorton;

// Configuración de ángulos del Servo
const int ANGULO_PORTON_CERRADO = 0;
const int ANGULO_PORTON_ABIERTO = 90;

// Variables de estado y tiempos
String inputBuffer = "";
unsigned long ultimoSensorCheck = 0;
const unsigned long INTERVALO_SENSOR = 1000; // Medir cada 1 segundo

bool portonAbierto = false;
String modoBano = "MANANA"; // Modos: MANANA, SPA, NOCHE, OFF

void setup() {
  // Inicializar Comunicación Serial
  Serial.begin(9600);
  
  // Configurar Pines
  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_BLUE, OUTPUT);
  pinMode(PIN_TRIGGER, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  
  // Inicializar Servo
  servoPorton.attach(PIN_SERVO_PORTON);
  servoPorton.write(ANGULO_PORTON_CERRADO);
  portonAbierto = false;
  
  // Inicializar Pantalla OLED
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("OLED: ERROR (No se detecta SSD1306)"));
  } else {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.display();
  }

  // Establecer estado inicial del baño (Modo Mañana)
  actualizarModoBano("MANANA");
  
  Serial.println(F("ARDUINO_COMBINADO: READY (Bano + Garaje en COM5)"));
}

void loop() {
  // 1. Escuchar Comandos Seriales entrantes
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
  
  // 2. Leer Sensor de Ultrasonido cada 1 segundo
  unsigned long currentMillis = millis();
  if (currentMillis - ultimoSensorCheck >= INTERVALO_SENSOR) {
    ultimoSensorCheck = currentMillis;
    
    long distancia = medirDistancia();
    
    // Imprimir telemetría en el formato que el servidor reconoce
    Serial.print("Distancia: ");
    Serial.print(distancia);
    Serial.println(" cm");
    
    // Lógica de seguridad automatizada en hardware:
    // Si la puerta del garaje está abierta y el coche se acerca a 5cm o menos, se cierra sola.
    if (portonAbierto && distancia > 0 && distancia <= 5) {
      servoPorton.write(ANGULO_PORTON_CERRADO);
      portonAbierto = false;
      Serial.println("Puerta CERRADA");
      
      // Enviar distancia segura por defecto después de cerrar para calmar el radar
      Serial.println("Distancia: 20 cm");
      actualizarOLED();
    }
  }
}

// Mide la distancia usando el sensor HC-SR04
long medirDistancia() {
  digitalWrite(PIN_TRIGGER, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIGGER, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIGGER, LOW);
  
  long duracion = pulseIn(PIN_ECHO, HIGH, 30000); // 30ms de timeout
  
  if (duracion == 0) {
    return 30; // Si no hay eco, asumir distancia máxima segura
  }
  
  return duracion / 29 / 2;
}

// Procesa los comandos enviados por el Panel / Asistente
void processCommand(String cmd) {
  // --- COMANDOS DEL BAÑO ---
  if (cmd.equals("SPA")) {
    actualizarModoBano("SPA");
    Serial.println("BANO_STATE:SPA");
  } 
  else if (cmd.equals("MANANA")) {
    actualizarModoBano("MANANA");
    Serial.println("BANO_STATE:MANANA");
  } 
  else if (cmd.equals("NOCHE")) {
    actualizarModoBano("NOCHE");
    Serial.println("BANO_STATE:NOCHE");
  }
  else if (cmd.equals("OFF")) {
    actualizarModoBano("OFF");
    Serial.println("BANO_STATE:OFF");
  }
  
  // --- COMANDOS DEL GARAJE ---
  else if (cmd.equals("ABRIR")) {
    servoPorton.write(ANGULO_PORTON_ABIERTO);
    portonAbierto = true;
    Serial.println("Puerta ABIERTA");
    actualizarOLED();
  }
  else if (cmd.equals("CERRAR")) {
    servoPorton.write(ANGULO_PORTON_CERRADO);
    portonAbierto = false;
    Serial.println("Puerta CERRADA");
    actualizarOLED();
  }
}

// Cambia el color del LED RGB y actualiza el OLED
void actualizarModoBano(String modo) {
  modoBano = modo;
  
  if (modo == "SPA") {
    setRGBColor(255, 0, 50); // Rojo/Rosa relajante
  } 
  else if (modo == "MANANA") {
    setRGBColor(0, 240, 255); // Azul/Celeste mañana
  } 
  else if (modo == "NOCHE") {
    setRGBColor(0, 255, 30); // Verde suave noche
  } 
  else if (modo == "OFF") {
    setRGBColor(0, 0, 0); // Apagar LED RGB
  }
  
  actualizarOLED();
}

// Escribe el estado actual del sistema en la pantalla OLED
void actualizarOLED() {
  display.clearDisplay();
  
  // Cabecera del sistema
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("NEXUS SH: ACTIVE");
  display.drawFastHLine(0, 10, 128, SSD1306_WHITE);
  
  // Estado del Baño
  display.setCursor(0, 18);
  display.print("Bano: ");
  if (modoBano == "OFF") {
    display.print("APAGADO");
  } else {
    display.print("MODO ");
    display.print(modoBano);
  }
  
  // Estado del Garaje
  display.setCursor(0, 36);
  display.print("Porton: ");
  if (portonAbierto) {
    display.print("ABIERTO (90)");
  } else {
    display.print("CERRADO (0)");
  }
  
  // Pie de página decorativo
  display.drawFastHLine(0, 50, 128, SSD1306_WHITE);
  display.setCursor(0, 55);
  display.print("Univ. Domotica 2026");
  
  display.display();
}

// Configura valores PWM en pines del LED RGB
void setRGBColor(int r, int g, int b) {
  // Para LED de Cátodo Común (GND común)
  analogWrite(PIN_RED, r);
  analogWrite(PIN_GREEN, g);
  analogWrite(PIN_BLUE, b);
  
  // Si usas LED de Ánodo Común (VCC común), descomenta lo siguiente y comenta lo anterior:
  // analogWrite(PIN_RED, 255 - r);
  // analogWrite(PIN_GREEN, 255 - g);
  // analogWrite(PIN_BLUE, 255 - b);
}
