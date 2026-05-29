/**
 * Arduino 2: Control de Sala Inteligente (Multimedia y Juegos)
 * Proyecto de Domótica por Voz - Universidad
 * 
 * Conexiones Sugeridas:
 * - TV: LED de estado -> Pin 7 (Verde = Encendido, Rojo = Apagado o LED simple)
 * - Piano: Buzzer Pasivo -> Pin 8 (Reproduce melodías o tonos al presionar teclas)
 * - Juegos: LED indicador de juego activo -> Pin 9
 * - Iluminación Ambiental Sala: Tira LED o LED -> Pin 10
 */

const int PIN_TV = 7;
const int PIN_BUZZER = 8;
const int PIN_JUEGO = 9;
const int PIN_LUCES_SALA = 10;

String inputBuffer = "";

// Notas del piano simplificadas
int notas[] = {262, 294, 330, 349, 392, 440, 494, 523}; // Do, Re, Mi, Fa, Sol, La, Si, Do (C4 a C5)

void setup() {
  Serial.begin(9600);
  
  pinMode(PIN_TV, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_JUEGO, OUTPUT);
  pinMode(PIN_LUCES_SALA, OUTPUT);
  
  // Estado Inicial
  digitalWrite(PIN_TV, LOW);
  digitalWrite(PIN_JUEGO, LOW);
  digitalWrite(PIN_LUCES_SALA, LOW);
  
  Serial.println("ARDUINO_2: READY (Sala)");
}

void loop() {
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
}

void processCommand(String cmd) {
  // --- COMANDOS DE LA TELEVISIÓN ---
  if (cmd.equals("TV_ON")) {
    digitalWrite(PIN_TV, HIGH);
    // Tono de encendido
    tone(PIN_BUZZER, 880, 100);
    delay(100);
    tone(PIN_BUZZER, 1200, 150);
    Serial.println("SALA_STATE:TV_ON");
  } 
  else if (cmd.equals("TV_OFF")) {
    digitalWrite(PIN_TV, LOW);
    // Tono de apagado
    tone(PIN_BUZZER, 600, 150);
    delay(150);
    tone(PIN_BUZZER, 400, 200);
    Serial.println("SALA_STATE:TV_OFF");
  }
  
  // --- COMANDOS DEL PIANO ---
  else if (cmd.startsWith("PLAY_NOTE:")) {
    // Comando ej: "PLAY_NOTE:0" para tocar nota Do
    int notaIndex = cmd.substring(10).toInt();
    if (notaIndex >= 0 && notaIndex < 8) {
      tone(PIN_BUZZER, notas[notaIndex], 200);
      Serial.println("SALA_STATE:PLAYING_NOTE_" + String(notaIndex));
    }
  }
  else if (cmd.equals("PIANO_ON")) {
    // Tocar una pequeña melodía de bienvenida al piano
    tocarMelodiaIntro();
    Serial.println("SALA_STATE:PIANO_ACTIVE");
  }
  
  // --- COMANDOS DEL JUEGO ---
  else if (cmd.equals("JUEGO_ON")) {
    digitalWrite(PIN_JUEGO, HIGH);
    // Sonido retro de juego
    for (int i = 0; i < 3; i++) {
      tone(PIN_BUZZER, 400 + (i * 200), 80);
      delay(80);
    }
    Serial.println("SALA_STATE:GAME_ON");
  }
  else if (cmd.equals("JUEGO_OFF")) {
    digitalWrite(PIN_JUEGO, LOW);
    Serial.println("SALA_STATE:GAME_OFF");
  }
  
  // --- ILUMINACIÓN AMBIENTAL GENERAL ---
  else if (cmd.equals("ENCENDER_SALA")) {
    digitalWrite(PIN_LUCES_SALA, HIGH);
    Serial.println("SALA_STATE:LIGHTS_ON");
  }
  else if (cmd.equals("APAGAR_SALA")) {
    digitalWrite(PIN_LUCES_SALA, LOW);
    Serial.println("SALA_STATE:LIGHTS_OFF");
  }
}

void tocarMelodiaIntro() {
  int melodia[] = {262, 330, 392, 523};
  int duracion = 150;
  for (int i = 0; i < 4; i++) {
    tone(PIN_BUZZER, melodia[i], duracion);
    delay(duracion + 30);
  }
}
