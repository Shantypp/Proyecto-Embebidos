#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Servo.h>
#include <DHT.h>

// =====================================
// OLED
// =====================================

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

Adafruit_SSD1306 display(
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  &Wire,
  -1
);

// true solo si el OLED inicializo bien (si falla, NO se usa el display).
bool oledOk = false;

// =====================================
// DHT11  (conectado en D5)
// =====================================

#define DHTPIN 5
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

// =====================================
// RGB COCINA (ANODO COMUN: 0 = encendido, 255 = apagado)
// Solo verde y azul, igual que tu montaje.
// =====================================

int verde = 4;
int azul = 3;

// =====================================
// SENSOR FUEGO / BUZZER / GAS
// =====================================

int fuegoPin = 6;
int buzzer = 7;
int gasPin = A0;

// =====================================
// SERVO PERSIANA (Habitacion) - servo POSICIONAL
// Ajusta estos angulos segun como quede tu persiana fisicamente.
// =====================================

Servo persiana;

// Servo de ROTACION CONTINUA: 90 = detenido, 0 y 180 = girar en cada sentido.
// El ANGULO que gira depende del TIEMPO girando: en tu servo ~700 ms = vuelta
// completa (360 grados), asi que ~175 ms ≈ 90 grados (un cuarto de vuelta).
// Si no queda exacto, sube o baja este valor.
const int PERSIANA_MS = 175; // ~90 grados

// =====================================
// VARIABLES
// =====================================

String comando = "";

unsigned long ultimoChar = 0;
const unsigned long TIMEOUT_COMANDO = 60; // ms sin recibir -> procesar

float temperatura = 0;
float humedad = 0;
int gasValor = 0;
int fuego = HIGH; // HIGH = sin fuego (sensor activo en LOW)

unsigned long ultimaTelemetria = 0;
const unsigned long INTERVALO_TELEMETRIA = 2000; // enviar cada 2 s

// =====================================

void setup() {

  Serial.begin(9600);

  dht.begin();

  // RGB
  pinMode(verde, OUTPUT);
  pinMode(azul, OUTPUT);
  apagarRGB();

  // FUEGO / BUZZER
  pinMode(fuegoPin, INPUT);
  pinMode(buzzer, OUTPUT);
  digitalWrite(buzzer, LOW);

  // SERVO PERSIANA: dejarlo detenido y SIN señal para que no gire solo.
  persiana.attach(9);
  persiana.write(90);   // neutro
  persiana.detach();    // corta la señal -> el servo queda quieto

  // =====================================
  // OLED: probar 0x3C y 0x3D. Sin while(true).
  // =====================================
  oledOk = display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (!oledOk) {
    oledOk = display.begin(SSD1306_SWITCHCAPVCC, 0x3D);
  }
  if (!oledOk) {
    Serial.println(F("OLED ERROR"));
  }

  Serial.println(F("Cocina + Habitacion LISTO"));
}

// =====================================

void loop() {

  // =====================================
  // 1. LEER COMANDOS (no bloqueante, inmune al line ending)
  // =====================================

  while (Serial.available() > 0) {

    char c = (char)Serial.read();

    if (c == '\n' || c == '\r') {
      ejecutarComando();
    }
    else {
      comando += c;
      ultimoChar = millis();
    }
  }

  if (comando.length() > 0 && (millis() - ultimoChar) > TIMEOUT_COMANDO) {
    ejecutarComando();
  }

  // =====================================
  // 2. LEER GAS Y FUEGO (instantaneo, para alarmas)
  // =====================================

  gasValor = analogRead(gasPin);
  fuego = digitalRead(fuegoPin);

  // Alarma: fuego (activo en LOW) o gas alto
  if (fuego == LOW || gasValor > 500) {
    digitalWrite(buzzer, HIGH);
  } else {
    digitalWrite(buzzer, LOW);
  }

  // =====================================
  // 3. TELEMETRIA cada 2 s (formato que el servidor reconoce)
  // =====================================

  if (millis() - ultimaTelemetria >= INTERVALO_TELEMETRIA) {

    ultimaTelemetria = millis();

    float t = dht.readTemperature();
    float h = dht.readHumidity();

    if (isnan(t) || isnan(h)) {
      Serial.println(F("ERROR DHT11"));
    } else {
      temperatura = t;
      humedad = h;

      Serial.print(F("TEMP:"));
      Serial.println(temperatura);

      Serial.print(F("HUM:"));
      Serial.println(humedad);
    }

    Serial.print(F("GAS:"));
    Serial.println(gasValor);

    Serial.print(F("FIRE:"));
    Serial.println(fuego == LOW ? 1 : 0);

    mostrarClima();
  }
}

// =====================================
// VALIDA Y DESPACHA EL COMANDO
// =====================================

void ejecutarComando() {
  comando.trim();
  if (comando.length() > 0) {
    procesarComando(comando);
  }
  comando = "";
}

// =====================================
// PROCESAR COMANDO
// =====================================

void procesarComando(String cmd) {

  cmd.toLowerCase(); // funciona con minuscula/mayuscula y con lo que manda el servidor

  // ---------- COCINA ----------
  if (cmd == "nevera") {
    azulColor();
    Serial.println(F("NEVERA ON"));
  }
  else if (cmd == "cocina") {
    verdeColor();
    Serial.println(F("LUZ COCINA ON"));
  }
  else if (cmd == "estufa") {
    cyan();
    Serial.println(F("ESTUFA ON"));
  }
  else if (cmd == "off") {
    apagarRGB();
    Serial.println(F("COCINA OFF"));
  }

  // ---------- HABITACION: PERSIANA ----------
  else if (cmd == "abrir_persiana") {
    moverPersiana(0);   // girar en un sentido
    Serial.println(F("Persiana ABIERTA"));
  }
  else if (cmd == "cerrar_persiana") {
    moverPersiana(180); // girar en el otro sentido
    Serial.println(F("Persiana CERRADA"));
  }

  // ---------- HABITACION: LUCES (sin hardware dedicado, solo confirmacion) ----------
  else if (cmd == "encender_habitacion") {
    Serial.println(F("HABITACION ON"));
  }
  else if (cmd == "apagar_habitacion") {
    Serial.println(F("HABITACION OFF"));
  }
}

// =====================================
// PERSIANA (servo rotacion continua): girar un tiempo y detener de verdad
// =====================================

void moverPersiana(int sentido) {
  persiana.attach(9);
  persiana.write(sentido);  // 0 o 180 -> girar
  delay(PERSIANA_MS);
  persiana.write(90);       // neutro
  persiana.detach();        // corta la señal -> se detiene de verdad
}

// =====================================
// OLED: mostrar clima (numeros dinamicos)
// =====================================

void mostrarClima() {

  if (!oledOk) return;

  display.clearDisplay();

  display.setTextColor(WHITE);

  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(F("COCINA + HAB"));

  display.setCursor(0, 18);
  display.print(F("Temp: "));
  display.print(temperatura);
  display.println(F(" C"));

  display.setCursor(0, 32);
  display.print(F("Hum:  "));
  display.print(humedad);
  display.println(F(" %"));

  display.setCursor(0, 46);
  display.print(F("Gas:  "));
  display.print(gasValor);
  if (fuego == LOW) {
    display.setCursor(70, 46);
    display.print(F("FUEGO!"));
  }

  display.display();
}

// =====================================
// RGB COCINA (ANODO COMUN: 0 = ON, 255 = OFF)
// =====================================

// VERDE (luz cocina)
void verdeColor() {
  analogWrite(verde, 0);
  analogWrite(azul, 255);
}

// AZUL (nevera)
void azulColor() {
  analogWrite(verde, 255);
  analogWrite(azul, 0);
}

// CYAN (estufa / alarma)
void cyan() {
  analogWrite(verde, 0);
  analogWrite(azul, 0);
}

// APAGAR
void apagarRGB() {
  analogWrite(verde, 255);
  analogWrite(azul, 255);
}
