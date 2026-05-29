/**
 * Arduino 1: Control de Baño Inteligente y Cocina Inteligente
 * Proyecto de Domótica por Voz - Universidad
 * 
 * Conexiones Sugeridas:
 * - Baño: LED RGB (Rojo -> Pin 3, Verde -> Pin 5, Azul -> Pin 6) PWM
 * - Cocina: Luces Cocina -> Pin 7 (Relé/LED)
 * - Cocina: Ventilación -> Pin 8 (Motor DC/Relé)
 * - Cocina: Estufa -> Pin 9 (LED de calor/Relé)
 */

// Pines del Baño (RGB)
const int PIN_RED = 3;
const int PIN_GREEN = 5;
const int PIN_BLUE = 6;

// Pines de la Cocina
const int PIN_LUCES = 7;
const int PIN_VENTILADOR = 8;
const int PIN_ESTUFA = 9;

String inputBuffer = "";

void setup() {
  // Inicializar Comunicación Serial a 9600 baudios
  Serial.begin(9600);
  
  // Configurar Pines como Salidas
  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_BLUE, OUTPUT);
  
  pinMode(PIN_LUCES, OUTPUT);
  pinMode(PIN_VENTILADOR, OUTPUT);
  pinMode(PIN_ESTUFA, OUTPUT);
  
  // Estado Inicial: Todo apagado, baño en color azul (Mañana)
  setRGBColor(0, 0, 255); // Azul por defecto
  digitalWrite(PIN_LUCES, LOW);
  digitalWrite(PIN_VENTILADOR, LOW);
  digitalWrite(PIN_ESTUFA, LOW);
  
  Serial.println("ARDUINO_1: READY (Bano + Cocina)");
}

void loop() {
  // Leer caracteres de la interfaz serial
  while (Serial.available() > 0) {
    char inChar = (char)Serial.read();
    
    // Si llega un salto de línea, procesar el comando acumulado
    if (inChar == '\n' || inChar == '\r') {
      inputBuffer.trim();
      if (inputBuffer.length() > 0) {
        processCommand(inputBuffer);
      }
      inputBuffer = ""; // Resetear buffer
    } else {
      inputBuffer += inChar;
    }
  }
}

// Procesar comandos recibidos
void processCommand(String cmd) {
  // --- COMANDOS DEL BAÑO ---
  if (cmd.equals("SPA")) {
    setRGBColor(255, 0, 50); // Rojo / Rosa Spa
    Serial.println("BANO_STATE:SPA");
  } 
  else if (cmd.equals("MANANA")) {
    setRGBColor(0, 240, 255); // Celeste / Azul Mañana
    Serial.println("BANO_STATE:MANANA");
  } 
  else if (cmd.equals("NOCHE")) {
    setRGBColor(0, 255, 30); // Verde suave Noche
    Serial.println("BANO_STATE:NOCHE");
  }
  
  // --- COMANDOS DE LA COCINA ---
  else if (cmd.equals("ENCENDER_COCINA")) {
    digitalWrite(PIN_LUCES, HIGH);
    digitalWrite(PIN_VENTILADOR, HIGH);
    digitalWrite(PIN_ESTUFA, HIGH);
    Serial.println("COCINA_STATE:ALL_ON");
  }
  else if (cmd.equals("APAGAR_COCINA")) {
    digitalWrite(PIN_LUCES, LOW);
    digitalWrite(PIN_VENTILADOR, LOW);
    digitalWrite(PIN_ESTUFA, LOW);
    Serial.println("COCINA_STATE:ALL_OFF");
  }
  else if (cmd.equals("VENTILACION_ON")) {
    digitalWrite(PIN_VENTILADOR, HIGH);
    Serial.println("COCINA_STATE:FAN_ON");
  }
  else if (cmd.equals("VENTILACION_OFF")) {
    digitalWrite(PIN_VENTILADOR, LOW);
    Serial.println("COCINA_STATE:FAN_OFF");
  }
  else if (cmd.equals("LUCES_COCINA_ON")) {
    digitalWrite(PIN_LUCES, HIGH);
    Serial.println("COCINA_STATE:LIGHTS_ON");
  }
  else if (cmd.equals("LUCES_COCINA_OFF")) {
    digitalWrite(PIN_LUCES, LOW);
    Serial.println("COCINA_STATE:LIGHTS_OFF");
  }
}

// Función auxiliar para setear colores en LED RGB (ánodo o cátodo común)
void setRGBColor(int r, int g, int b) {
  // Si utilizas LED RGB de Cátodo Común (conectar GND a tierra):
  analogWrite(PIN_RED, r);
  analogWrite(PIN_GREEN, g);
  analogWrite(PIN_BLUE, b);
  
  // Si usas LED RGB de Ánodo Común (conectar VCC a 5V), descomenta esto y comenta lo anterior:
  // analogWrite(PIN_RED, 255 - r);
  // analogWrite(PIN_GREEN, 255 - g);
  // analogWrite(PIN_BLUE, 255 - b);
}
